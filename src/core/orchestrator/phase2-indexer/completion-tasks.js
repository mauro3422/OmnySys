import { getPhase2FileCounts } from '#shared/compiler/index.js';

export async function runPhase2CompletionTasks(projectPath, logger) {
    try {
        await persistFinalGraphMetrics(projectPath, logger);
        await persistSharedStateRelations(projectPath);
        await persistTechnicalDebtSummary(projectPath);
        await printFinalDiagnosticsDashboard(projectPath, logger);
    } catch (error) {
        logger.debug('Post-Phase2 completion tasks failed:', error.message);
    }
}

async function persistFinalGraphMetrics(projectPath, logger) {
    const { persistGraphMetrics } = await import('#layer-c/storage/enrichment/index.js');
    await persistGraphMetrics(projectPath);
    logger.debug('Phase 2 complete - final graph metrics persisted');
}

async function persistSharedStateRelations(projectPath) {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    const allAtoms = repo.getAll({ limit: 0 });
    if (!allAtoms || allAtoms.length === 0) {
        return;
    }

    const { saveSharedStateRelations } = await import('#layer-a/pipeline/link.js');
    await saveSharedStateRelations(allAtoms, projectPath, true);
}

async function persistTechnicalDebtSummary(projectPath) {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const debtRepo = getRepository(projectPath);
    if (!debtRepo?.db) {
        return;
    }

    const { queryDuplicates } = await import('#layer-c/mcp/tools/semantic/semantic-queries.js');
    const { buildDuplicateRemediationPlan, getPipelineOrphanSummary } = await import('#shared/compiler/index.js');
    const { DuplicateHandler } = await import('#layer-c/mcp/tools/semantic/handlers/duplicate-handler.js');
    const { persistWatcherIssue, clearWatcherIssue } = await import('#core/file-watcher/watcher-issue-persistence.js');
    const { createIssueType } = await import('#core/file-watcher/guards/guard-standards.js');

    const { rows: duplicateRows, stats: duplicateStats } = queryDuplicates(debtRepo.db, { limit: 50 });
    const structuralDuplicates = new DuplicateHandler(debtRepo.db).handle(duplicateRows);
    const structuralRemediation = buildDuplicateRemediationPlan(structuralDuplicates);
    const conceptualGroups = debtRepo.findConceptualDuplicates
        ? debtRepo.findConceptualDuplicates({ limit: 50 })
        : [];
    const conceptualSummary = conceptualGroups?.summary || null;
    const orphanSummary = getPipelineOrphanSummary(debtRepo.db);

    await clearWatcherIssue(projectPath, 'project-wide', 'technical_debt_report');

    const phase2Counts = getPhase2FileCounts(debtRepo.db);
    const totalDebtItems =
        (structuralRemediation?.totalGroups || 0) +
        (conceptualSummary?.actionable?.groupCount || conceptualGroups?.length || 0) +
        (orphanSummary?.total || 0);

    if (totalDebtItems <= 0) {
        return;
    }

    const severity = totalDebtItems > 10 ? 'high' : totalDebtItems > 5 ? 'medium' : 'low';
    await persistWatcherIssue(
        projectPath,
        'project-wide',
        createIssueType('arch', 'technical_debt', severity),
        severity,
        `${totalDebtItems} technical debt items detected post-Phase 2`,
        {
            source: 'phase2_post_completion',
            timestamp: new Date().toISOString(),
            structural: {
                groups: structuralDuplicates.length,
                instances: duplicateStats.total_instances,
                topIssues: structuralRemediation?.items?.slice(0, 5) || []
            },
            conceptual: {
                groups: conceptualSummary?.actionable?.groupCount || conceptualGroups.length,
                rawGroups: conceptualSummary?.raw?.groupCount || conceptualGroups.length,
                noiseByClass: conceptualSummary?.noiseByClass || {},
                topIssues: conceptualGroups.slice(0, 5).map((group) => ({
                    fingerprint: group.semanticFingerprint,
                    implementationCount: group.implementationCount
                }))
            },
            pipelineOrphans: {
                total: orphanSummary?.total || 0,
                items: orphanSummary?.items?.slice(0, 5) || []
            },
            phase2: {
                pendingFiles: phase2Counts.pendingFiles,
                completedFiles: phase2Counts.completedFiles,
                liveFileCount: phase2Counts.liveFileCount
            },
            remediation: {
                nextAction: structuralRemediation?.recommendation || orphanSummary?.recommendation || 'No immediate action required'
            }
        }
    );
}

async function printFinalDiagnosticsDashboard(projectPath, logger) {
    try {
        const { printDiagnosticsDashboard } = await import('#layer-c/mcp/core/initialization/dashboard-reporter.js');
        await printDiagnosticsDashboard(projectPath, { isFinal: true });
    } catch (error) {
        logger.debug('Failed to display final Diagnostics Dashboard:', error.message);
    }
}
