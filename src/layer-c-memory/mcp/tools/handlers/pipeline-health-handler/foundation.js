import {
    buildPropagationPlan,
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
    getIssueSummary,
    summarizePropagationPlan
} from '../../../../../shared/compiler/index.js';
import { syncRuntimeTableHealthIssues } from '../../../../../core/diagnostics/tables.js';
import {
    loadExpectedPipelineTableCounts,
    buildLiveRowTableCounts,
    scanCompilerPolicyHealth,
    loadDuplicateGroups
} from '../pipeline-health-domain/index.js';
import { getDatabaseHealthSummary } from '../../../../../shared/compiler/index.js';

export async function collectPipelineHealthFoundation({ db, projectPath }) {
    const runtimeTableHealth = await syncRuntimeTableHealthIssues(projectPath, { db, deep: true });
    const issues = [];
    const warnings = [];
    const tableHealth = loadExpectedPipelineTableCounts(db);
    const tableCounts = { ...tableHealth.tableCounts };
    issues.push(...tableHealth.issues);
    warnings.push(...tableHealth.warnings);

    const liveRowSync = ensureLiveRowSync(db, { autoSync: true, sampleLimit: 5 });
    const databaseHealth = getDatabaseHealthSummary(db, { autoSyncLiveRows: false });
    tableCounts.database_health_score = databaseHealth.healthScore;
    tableCounts.database_call_relations = databaseHealth.metrics.activeCallRelations || 0;
    tableCounts.database_call_graph_rows = databaseHealth.metrics.callGraphRows || 0;
    tableCounts.database_risk_contradictions = databaseHealth.metrics.contradictoryRiskRows || 0;

    if (databaseHealth.healthy === false) {
        const finding = {
            field: 'database_health',
            coverage: `${databaseHealth.healthScore}/100 (${databaseHealth.grade})`,
            issue: databaseHealth.summary
        };
        if ((databaseHealth.criticalFindings || []).length > 0) {
            issues.push(finding);
        } else {
            warnings.push(finding);
        }
    }

    const phase2PendingFiles = db.prepare('SELECT COUNT(DISTINCT file_path) as total FROM atoms WHERE is_phase2_complete = 0').get()?.total || 0;
    const { liveAtomFiles, staleAtomRows, staleFileRows, staleRiskRows, deletedCount } = buildLiveRowTableCounts(liveRowSync);
    tableCounts.live_atom_files = liveAtomFiles;
    tableCounts.stale_atom_rows = staleAtomRows;
    tableCounts.stale_file_rows = staleFileRows;
    tableCounts.stale_risk_rows = staleRiskRows;
    tableCounts.live_row_sync_deleted = deletedCount;

    const desyncedCallerCounts = db.prepare(`
        SELECT COUNT(*) as total
        FROM atoms a
        WHERE COALESCE(a.callers_count, 0) = 0
          AND EXISTS (
              SELECT 1
              FROM atom_relations ar
              WHERE ar.relation_type = 'calls'
                AND COALESCE(ar.is_removed, 0) = 0
                AND ar.target_id = a.id
          )
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
            issue: 'callers_count is out of sync with canonical call relations - reindex recommended'
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
    const propagation = summarizePropagationPlan(buildPropagationPlan({
        changeType: 'pipeline_health',
        decision: issues.length > 0 ? 'review' : 'approve',
        mode: issues.length > 0 ? 'alert_and_review' : 'alert_and_recommend',
        candidateCount: orphanFunctions.length + suspiciousDeadCandidates.length,
        findingCount: issues.length + warnings.length,
        ruleCount: policyHealth.policySummary?.total || 0,
        policyAreaCount: Object.keys(policyHealth.policySummary?.byPolicyArea || {}).length,
        connectedSystems: ['pipeline_health', 'status_panel', 'health_snapshot', 'compiler_explainability', 'cache_policy'],
        recommendationStrategy: issues.length > 0 ? 'repair_pipeline_health_findings' : 'keep_pipeline_health_aligned'
    }));

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
        databaseHealth,
        orphanFunctions,
        pipelineOrphanSummary,
        zeroFields: fieldCoverage.zeroFields,
        suspiciousDeadCandidates,
        policySummary: policyHealth.policySummary,
        issueSummary: getIssueSummary(db, { minDeadCodeLines: 5 }),
        propagation
    };
}
