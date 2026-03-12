import {
    buildCompilerRemediationBacklog,
    buildPipelineHealthCompilerRemediationItems,
    buildDeadCodeRemediationPlan,
    buildLiveRowRemediationPlan,
    buildDuplicateRemediationPlan,
    buildPipelineOrphanRemediationPlan,
    buildLiveRowReconciliationPlan,
    ensureLiveRowSync,
    collectPipelineFieldCoverageFindings,
    getDeadCodePlausibilitySummary,
    getPipelineOrphanSummary,
    getIssueSummary
} from '../../../../../shared/compiler/index.js';
import { syncRuntimeTableHealthIssues } from '../../../../../core/diagnostics/runtime-table-health.js';
import {
    loadExpectedPipelineTableCounts,
    buildLiveRowTableCounts,
    scanCompilerPolicyHealth,
    loadDuplicateGroups
} from '../pipeline-health-domain/index.js';

export async function collectPipelineHealthFoundation({ db, projectPath }) {
    const runtimeTableHealth = await syncRuntimeTableHealthIssues(projectPath, { db, deep: true });
    const issues = [];
    const warnings = [];
    const tableHealth = loadExpectedPipelineTableCounts(db);
    const tableCounts = { ...tableHealth.tableCounts };
    issues.push(...tableHealth.issues);
    warnings.push(...tableHealth.warnings);

    const liveRowSync = ensureLiveRowSync(db, { autoSync: true, sampleLimit: 5 });
    const phase2PendingFiles = db.prepare('SELECT COUNT(DISTINCT file_path) as total FROM atoms WHERE is_phase2_complete = 0').get()?.total || 0;
    const { liveAtomFiles, staleFileRows, staleRiskRows, deletedCount } = buildLiveRowTableCounts(liveRowSync);
    tableCounts.live_atom_files = liveAtomFiles;
    tableCounts.stale_file_rows = staleFileRows;
    tableCounts.stale_risk_rows = staleRiskRows;
    tableCounts.live_row_sync_deleted = deletedCount;

    const desyncedCallerCounts = db.prepare(`
        SELECT COUNT(*) as total
        FROM atoms a
        WHERE callers_count = 0
          AND called_by_json IS NOT NULL
          AND called_by_json != ''
          AND called_by_json != '[]'
    `).get()?.total || 0;

    if (staleFileRows > 0) {
        warnings.push({
            field: 'files_table',
            coverage: `${staleFileRows} stale rows`,
            issue: 'files table contains historical entries not present in the live atom graph'
        });
    }

    if (staleRiskRows > 0) {
        warnings.push({
            field: 'risk_assessments',
            coverage: `${staleRiskRows} stale rows`,
            issue: 'risk_assessments contains entries for files that are no longer present in the live atom graph'
        });
    }

    if (desyncedCallerCounts > 0) {
        warnings.push({
            field: 'callers_count',
            coverage: `${desyncedCallerCounts} atoms`,
            issue: 'callers_count is out of sync with called_by_json - reindex recommended'
        });
    }

    const fieldCoverage = collectPipelineFieldCoverageFindings({ db, phase2PendingFiles });
    issues.push(...fieldCoverage.issues);
    warnings.push(...fieldCoverage.warnings);

    const pipelineOrphanSummary = getPipelineOrphanSummary(db, { candidateLimit: 50, orphanLimit: 20, minComplexity: 3 });
    const orphanFunctions = pipelineOrphanSummary.orphans;
    const pipelineOrphanRemediation = buildPipelineOrphanRemediationPlan(orphanFunctions);
    if (pipelineOrphanSummary.warning) warnings.push(pipelineOrphanSummary.warning);

    const deadCodeSummary = getDeadCodePlausibilitySummary(db, { minLines: 5 });
    const suspiciousDeadCandidates = deadCodeSummary.suspiciousDeadCandidates;
    const deadCodeRemediation = buildDeadCodeRemediationPlan(db, { limit: 10, minLines: 5 });
    if (deadCodeSummary.warning) warnings.push(deadCodeSummary.warning);

    const policyHealth = await scanCompilerPolicyHealth(projectPath);
    issues.push(...policyHealth.issues);
    warnings.push(...policyHealth.warnings);
    Object.assign(tableCounts, policyHealth.tableCounts);

    const liveRowReconciliation = buildLiveRowReconciliationPlan(db, { sampleLimit: 5 });
    const liveRowRemediation = buildLiveRowRemediationPlan(db, { sampleLimit: 5 });
    const duplicateGroups = loadDuplicateGroups(db);
    const duplicateRemediation = buildDuplicateRemediationPlan(duplicateGroups);
    tableCounts.runtime_table_health_issues = runtimeTableHealth.activeIssues.length;

    const compilerRemediation = buildCompilerRemediationBacklog(
        buildPipelineHealthCompilerRemediationItems({
            liveRowRemediation,
            pipelineOrphanRemediation,
            orphanFunctions,
            deadCodeRemediation,
            suspiciousDeadCandidates,
            duplicateRemediation,
            staleFileRows,
            staleRiskRows
        })
    );

    return {
        issues,
        warnings,
        tableCounts,
        liveRowSync,
        liveRowReconciliation,
        liveRowRemediation,
        deadCodeRemediation,
        duplicateRemediation,
        pipelineOrphanRemediation,
        compilerRemediation,
        runtimeTableHealth,
        orphanFunctions,
        pipelineOrphanSummary,
        zeroFields: fieldCoverage.zeroFields,
        suspiciousDeadCandidates,
        policySummary: policyHealth.policySummary,
        issueSummary: getIssueSummary(db, { minDeadCodeLines: 5 })
    };
}
