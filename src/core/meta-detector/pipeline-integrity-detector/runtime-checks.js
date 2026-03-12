import { buildIntegrityRecommendation } from '../integrity-contract.js';
import {
    auditWatcherIssues,
    collectOrphanCounts,
    countOrphanedWatcherIssues,
    getWatcherLifecycleDistribution,
    loadRecentWatcherIssues
} from '../pipeline-integrity-detector-helpers.js';
import { executeLiveRowCleanup } from '#shared/compiler/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:PipelineIntegrityDetector');

export function reconcileLiveRows(detector) {
    try {
        const cleanup = executeLiveRowCleanup(detector.repo.db, { dryRun: false });
        detector.lastCleanupResult = cleanup;

        const totalDeleted = (cleanup?.deleted?.files || 0)
            + (cleanup?.deleted?.riskAssessments || 0)
            + (cleanup?.deleted?.relations || 0)
            + (cleanup?.deleted?.issues || 0)
            + (cleanup?.deleted?.connections || 0);

        if (totalDeleted > 0) {
            logger.info(
                `Pipeline integrity reconciled ${totalDeleted} stale rows `
                + `(${cleanup.deleted.relations || 0} relations, ${cleanup.deleted.issues || 0} issues)`
            );
        }
    } catch (error) {
        logger.warn(`Pipeline integrity live-row reconciliation failed: ${error.message}`);
    }
}

export async function checkGuardExecution(detector) {
    try {
        const { guardRegistry } = await import(`../../file-watcher/guards/registry.js?bust=${Date.now()}`);
        await guardRegistry.initializeDefaultGuards();

        const stats = guardRegistry.getStats();
        const expectedGuards = { semantic: 8, impact: 12 };
        const missingGuards = [];

        if (!stats || !stats.byType) {
            throw new Error('Guard metrics unavailable (missing byType)');
        }

        if (stats.byType.semantic < expectedGuards.semantic) {
            missingGuards.push(`semantic: ${stats.byType.semantic}/${expectedGuards.semantic}`);
        }

        if (stats.byType.impact < expectedGuards.impact) {
            missingGuards.push(`impact: ${stats.byType.impact}/${expectedGuards.impact}`);
        }

        return detector._buildResult(
            'guard_execution',
            missingGuards.length === 0,
            missingGuards.length > 0 ? 'high' : 'low',
            {
                totalGuards: stats.total,
                byType: stats.byType,
                byDomain: stats.byDomain,
                missingGuards,
                expectedGuards
            },
            missingGuards.length > 0
                ? buildIntegrityRecommendation({
                    name: 'guard_execution',
                    details: { missingGuards, byType: stats.byType, expectedGuards }
                }).summary
                : 'All guards are registered and operational'
        );
    } catch (error) {
        logger.error('checkGuardExecution failed:', error.message);
        throw error;
    }
}

export async function checkIssuePersistence(detector) {
    try {
        const db = detector.repo.db;
        const recentIssues = loadRecentWatcherIssues(db);
        const {
            withoutLifecycle: issuesWithoutLifecycle,
            withoutContext: issuesWithoutContext
        } = auditWatcherIssues(recentIssues);
        const orphanedIssues = countOrphanedWatcherIssues(db);
        const lifecycleDistribution = getWatcherLifecycleDistribution(db);

        return detector._buildResult(
            'issue_persistence',
            orphanedIssues === 0 && issuesWithoutLifecycle === 0,
            orphanedIssues > 100 ? 'high' : orphanedIssues > 20 ? 'medium' : 'low',
            {
                totalIssues: recentIssues.length,
                withoutLifecycle: issuesWithoutLifecycle,
                withoutContext: issuesWithoutContext,
                orphanedIssues,
                lifecycleDistribution
            },
            orphanedIssues > 0 || issuesWithoutLifecycle > 0
                ? buildIntegrityRecommendation({
                    name: 'issue_persistence',
                    details: { orphanedIssues, withoutLifecycle: issuesWithoutLifecycle }
                }).summary
                : 'All issues are properly persisted with lifecycle'
        );
    } catch (error) {
        logger.error('checkIssuePersistence failed:', error.message);
        throw error;
    }
}

export async function checkMcpDataAccess(detector) {
    try {
        const db = detector.repo.db;
        const tools = [
            { name: 'query_atoms', test: () => db.prepare(`SELECT COUNT(*) as count FROM atoms LIMIT 1`).get() },
            { name: 'query_relations', test: () => db.prepare(`SELECT COUNT(*) as count FROM atom_relations LIMIT 1`).get() },
            { name: 'query_files', test: () => db.prepare(`SELECT COUNT(*) as count FROM files LIMIT 1`).get() },
            { name: 'query_issues', test: () => db.prepare(`SELECT COUNT(*) as count FROM semantic_issues LIMIT 1`).get() }
        ];

        const results = tools.map(tool => detector._runAccessProbe(tool.name, tool.test));
        const failedTools = results.filter(result => !result.success);

        return detector._buildResult(
            'mcp_data_access',
            failedTools.length === 0,
            failedTools.length > 0 ? 'high' : 'low',
            {
                totalTools: tools.length,
                failedTools: failedTools.map(tool => tool.tool),
                results
            },
            failedTools.length > 0
                ? buildIntegrityRecommendation({
                    name: 'mcp_data_access',
                    details: { failedTools: failedTools.map(tool => tool.tool) }
                }).summary
                : 'All MCP tools can access data correctly'
        );
    } catch (error) {
        logger.error('checkMcpDataAccess failed:', error.message);
        throw error;
    }
}

export async function checkOrphanedData(detector) {
    try {
        const orphans = collectOrphanCounts(detector.repo.db);
        const totalOrphans = Object.values(orphans).reduce((sum, count) => sum + count, 0);

        return detector._buildResult(
            'orphaned_data',
            totalOrphans === 0,
            totalOrphans > 100 ? 'high' : totalOrphans > 20 ? 'medium' : 'low',
            {
                totalOrphans,
                byType: orphans,
                samples: Object.fromEntries(
                    Object.entries(orphans).map(([key, count]) => [key, Math.min(count, 10)])
                )
            },
            totalOrphans > 0
                ? buildIntegrityRecommendation({ name: 'orphaned_data', details: { totalOrphans } }).summary
                : 'No orphaned data found'
        );
    } catch (error) {
        logger.error('checkOrphanedData failed:', error.message);
        throw error;
    }
}
