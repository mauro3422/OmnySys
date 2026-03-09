/**
 * Maneja el autodiagnóstico del pipeline (pipeline_health)
 * @param {Object} tool - Instancia de AggregateMetricsTool
 * @returns {Promise<Object>} Resultado del diagnóstico
 */
import {
    buildCompilerRemediationBacklog,
    summarizeCentralityCoverageRow,
    buildDeadCodeRemediationPlan,
    buildLiveRowRemediationPlan,
    buildDuplicateRemediationPlan,
    buildPipelineOrphanRemediationPlan,
    PIPELINE_FIELD_COVERAGE_SIGNALS,
    buildLiveRowReconciliationPlan,
    classifyFieldCoverage,
    ensureLiveRowSync,
    getLiveFileTotal,
    getMetadataSurfaceParity,
    getPipelineFieldCoverageContext,
    getSemanticSurfaceGranularity,
    summarizeSemanticCanonicality,
    loadCompilerDiagnosticsSnapshot,
    getDeadCodePlausibilitySummary,
    getPipelineOrphanSummary,
    scanCompilerPolicyDrift,
    summarizeCompilerPolicyDrift
} from '../../../../shared/compiler/index.js';
import { syncRuntimeTableHealthIssues } from '../../../../core/diagnostics/runtime-table-health.js';
import {
    loadExpectedPipelineTableCounts,
    buildLiveRowTableCounts,
    scanCompilerPolicyHealth,
    loadDuplicateGroups
} from './pipeline-health-domain/index.js';
import { checkMetadataParity } from './pipeline-health-domain/metadata-health.js';



export async function aggregatePipelineHealth(tool) {
    const db = tool.repo?.db;
    if (!db) throw new Error('Repository (DB) not available');
    const projectPath = tool.projectPath;
    const runtimeTableHealth = await syncRuntimeTableHealthIssues(projectPath, { db, deep: true });
    let policyFindings = [];
    let policySummary = { total: 0, high: 0, medium: 0, byPolicyArea: {}, byRule: {} };
    const liveRowSync = ensureLiveRowSync(db, { autoSync: true, sampleLimit: 5 });
    const phase2PendingFiles = db.prepare('SELECT COUNT(DISTINCT file_path) as total FROM atoms WHERE is_phase2_complete = 0').get()?.total || 0;
    const graphMetricFields = new Set(['coupling_score', 'cohesion_score', 'centrality_score']);

    const issues = [];
    const warnings = [];
    const { liveAtomFiles, staleFileRows, staleRiskRows, deletedCount } = buildLiveRowTableCounts(liveRowSync);

    const tableHealth = loadExpectedPipelineTableCounts(db);
    const tableCounts = { ...tableHealth.tableCounts };
    issues.push(...tableHealth.issues);
    warnings.push(...tableHealth.warnings);

    tableCounts.live_atom_files = liveAtomFiles;
    tableCounts.stale_file_rows = staleFileRows;
    tableCounts.stale_risk_rows = staleRiskRows;
    tableCounts.live_row_sync_deleted = deletedCount;

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

    const desyncedCallerCounts = db.prepare(`
        SELECT COUNT(*) as total
        FROM atoms a
        WHERE callers_count = 0
          AND called_by_json IS NOT NULL
          AND called_by_json != ''
          AND called_by_json != '[]'
    `).get()?.total || 0;

    if (desyncedCallerCounts > 0) {
        warnings.push({
            field: 'callers_count',
            coverage: `${desyncedCallerCounts} atoms`,
            issue: 'callers_count is out of sync with called_by_json — reindex recommended'
        });
    }

    const zeroFields = [];
    for (const { field, description, minWarningCoverage = 5 } of PIPELINE_FIELD_COVERAGE_SIGNALS) {
        try {
            const { whereClause, descriptionSuffix } = getPipelineFieldCoverageContext(field);
            const denominatorRow = db.prepare(`SELECT COUNT(*) as total FROM atoms ${whereClause}`).get();
            const scopedTotal = denominatorRow?.total || 0;
            if (scopedTotal === 0) continue;

            const row = db.prepare(
                `SELECT SUM(CASE WHEN ${field} != 0 AND ${field} IS NOT NULL THEN 1 ELSE 0 END) as nonzero FROM atoms ${whereClause}`
            ).get();
            const nonZeroCount = row?.nonzero || 0;
            const coverage = field === 'centrality_score'
                ? summarizeCentralityCoverageRow(
                    { total: scopedTotal, centrality_nonzero: nonZeroCount },
                    { minWarningCoverage, description, descriptionSuffix }
                )?.classification
                : classifyFieldCoverage({
                    total: scopedTotal,
                    nonZeroCount,
                    minWarningCoverage,
                    description,
                    descriptionSuffix
                });
            if (!coverage || coverage.level === 'ok') continue;

            if (coverage.level === 'issue' && phase2PendingFiles > 0 && graphMetricFields.has(field)) {
                warnings.push({
                    field,
                    coverage: '0%',
                    nonZeroCount,
                    issue: `Phase 2 still settling — ${description}`
                });
                continue;
            }

            if (coverage.level === 'issue') {
                issues.push({ field, coverage: '0%', nonZeroCount, issue: coverage.issue });
                zeroFields.push(field);
            } else if (coverage.level === 'warning') {
                warnings.push({ field, coverage: `${coverage.coveragePct}%`, nonZeroCount, issue: coverage.issue });
            }
        } catch {
            // Missing or incompatible field surfaces are handled as absent coverage.
        }
    }

    // --- CHECK 3: Pipeline orphans ---
    const pipelineOrphanSummary = getPipelineOrphanSummary(db, { candidateLimit: 50, orphanLimit: 20, minComplexity: 3 });
    const orphanFunctions = pipelineOrphanSummary.orphans;
    const pipelineOrphanRemediation = buildPipelineOrphanRemediationPlan(orphanFunctions);

    if (pipelineOrphanSummary.warning) {
        warnings.push(pipelineOrphanSummary.warning);
    }

    // --- CHECK 4: Dead code plausibility ---
    const deadCodeSummary = getDeadCodePlausibilitySummary(db, { minLines: 5 });
    const suspiciousDeadCandidates = deadCodeSummary.suspiciousDeadCandidates;
    const deadCodeRemediation = buildDeadCodeRemediationPlan(db, { limit: 10, minLines: 5 });

    if (deadCodeSummary.warning) {
        warnings.push(deadCodeSummary.warning);
    }

    const policyHealth = await scanCompilerPolicyHealth(projectPath);
    policyFindings = policyHealth.policyFindings;
    policySummary = policyHealth.policySummary;
    issues.push(...policyHealth.issues);
    warnings.push(...policyHealth.warnings);
    Object.assign(tableCounts, policyHealth.tableCounts);

    const liveRowReconciliation = buildLiveRowReconciliationPlan(db, { sampleLimit: 5 });
    const liveRowRemediation = buildLiveRowRemediationPlan(db, { sampleLimit: 5 });
    const duplicateGroups = loadDuplicateGroups(db);
    const duplicateRemediation = buildDuplicateRemediationPlan(duplicateGroups);
    const metadataSurfaceParity = getMetadataSurfaceParity(db);
    const semanticSurfaceGranularity = getSemanticSurfaceGranularity(db);
    const semanticCanonicality = summarizeSemanticCanonicality(semanticSurfaceGranularity);

    checkMetadataParity(metadataSurfaceParity, semanticSurfaceGranularity, semanticCanonicality, warnings, tableCounts);

    tableCounts.runtime_table_health_issues = runtimeTableHealth.activeIssues.length;
    const compilerRemediation = buildCompilerRemediationBacklog([
        {
            id: 'live_rows',
            label: 'Live/stale row cleanup',
            severity: staleFileRows > 0 || staleRiskRows > 0 ? 'high' : 'low',
            totalItems: staleFileRows + staleRiskRows,
            recommendation: liveRowRemediation.recommendation,
            items: liveRowRemediation.items || []
        },
        {
            id: 'pipeline_orphans',
            label: 'Pipeline orphan remediation',
            severity: orphanFunctions.length > 0 ? 'high' : 'low',
            totalItems: pipelineOrphanRemediation.totalCandidates || orphanFunctions.length,
            recommendation: pipelineOrphanRemediation.recommendation,
            items: pipelineOrphanRemediation.items || []
        },
        {
            id: 'dead_code',
            label: 'Dead code remediation',
            severity: suspiciousDeadCandidates > 0 ? 'medium' : 'low',
            totalItems: deadCodeRemediation.totalCandidates || suspiciousDeadCandidates,
            recommendation: deadCodeRemediation.recommendation,
            items: deadCodeRemediation.items || []
        },
        {
            id: 'duplicates',
            label: 'Duplicate remediation',
            severity: duplicateRemediation.totalGroups > 0 ? 'medium' : 'low',
            totalItems: duplicateRemediation.totalGroups || 0,
            recommendation: duplicateRemediation.recommendation,
            items: duplicateRemediation.items || []
        }
    ]);
    const recentWatcherAlerts = tool.recentNotifications?.watcherAlerts || tool.latestRecentErrors?.watcherAlerts || [];
    const compilerDiagnostics = await loadCompilerDiagnosticsSnapshot({
        projectPath,
        db,
        policySummary,
        watcherAlerts: recentWatcherAlerts,
        sharedState: tool.server?.sharedCache?.metadata?.sharedState || tool.server?.sharedState || {},
        compilerRemediation,
        canonicalAdoptions: {
            centralityCoverage: true,
            sharedStateContention: true,
            scannedFileManifest: true
        },
        tableCounts
    });
    const {
        persistedFileCoverage,
        fileImportEvidenceCoverage,
        systemMapPersistenceCoverage,
        semanticCanonicality: canonicalSemanticSurface,
        fileUniverseGranularity,
        standardizationReport,
        compilerContractLayer
    } = compilerDiagnostics;

    if (compilerContractLayer.summary.healthy === false) {
        warnings.push({
            field: 'compiler_contract_layer',
            coverage: `${compilerContractLayer.summary.failedInvariantCount} invariant(s) failed`,
            issue: 'The explicit compiler contract layer reports truth-surface violations; block new wrappers until the contract is healthy.'
        });
    }

    if (compilerContractLayer.apiGovernance.shouldCreateCanonicalApi === true) {
        warnings.push({
            field: 'compiler_api_governance',
            coverage: `${compilerContractLayer.apiGovernance.currentCreationCandidates.length} candidate(s)`,
            issue: 'The contract layer recommends creating or consolidating canonical APIs before adding more local wrappers.'
        });
    }

    const governanceMetrics = compilerContractLayer.apiGovernance.governanceMetrics || {};
    tableCounts.compiler_canonical_wrapper_findings = governanceMetrics.canonicalWrapperFindings || 0;
    tableCounts.compiler_canonical_bypass_findings = governanceMetrics.canonicalBypassFindings || 0;
    tableCounts.compiler_parallel_surface_findings = governanceMetrics.parallelCanonicalSurfaceFindings || 0;

    if ((governanceMetrics.canonicalWrapperFindings || 0) > 0) {
        warnings.push({
            field: 'compiler_canonical_wrappers',
            coverage: `${governanceMetrics.canonicalWrapperFindings} wrapper finding(s)`,
            issue: 'Runtime modules still wrap canonical shared/compiler APIs locally instead of calling them directly.'
        });
    }

    if ((governanceMetrics.canonicalBypassFindings || 0) > 0) {
        warnings.push({
            field: 'compiler_canonical_bypass',
            coverage: `${governanceMetrics.canonicalBypassFindings} bypass finding(s)`,
            issue: 'Some modules still recompute canonical diagnostics or policy surfaces instead of consuming the canonical snapshot.'
        });
    }

    if ((governanceMetrics.parallelCanonicalSurfaceFindings || 0) > 0) {
        warnings.push({
            field: 'compiler_parallel_surfaces',
            coverage: `${governanceMetrics.parallelCanonicalSurfaceFindings} parallel surface finding(s)`,
            issue: 'The compiler still sees local policy/helper surfaces that should be consolidated into the canonical layer.'
        });
    }

    const compilerHealthScore = Math.max(0, 100 - (issues.length * 15) - (warnings.length * 5));

    // Calcula Gobernanza: Basado en las auditorías de políticas, de guardias canónicos, etc.
    const expectedGovernanceFindings =
        (governanceMetrics.canonicalWrapperFindings || 0) +
        (governanceMetrics.canonicalBypassFindings || 0) +
        (governanceMetrics.parallelCanonicalSurfaceFindings || 0) +
        (compilerContractLayer.summary.failedInvariantCount || 0) +
        (tableCounts.compiler_policy_high || 0) * 2;

    // Un simple penalty de gobernanza (5 puntos por cada hallazgo arquitectónico base)
    const governancePenalty = expectedGovernanceFindings * 5;
    const governanceScore = Math.max(0, 100 - governancePenalty);

    const healthScore = Math.max(0, Math.floor((compilerHealthScore * 0.7) + (governanceScore * 0.3))); // Weighted average
    const grade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D';

    return {
        healthScore,
        grade,
        tableCounts,
        issues,
        warnings,
        liveRowSync,
        liveRowReconciliation,
        liveRowRemediation,
        deadCodeRemediation,
        duplicateRemediation,
        pipelineOrphanRemediation,
        compilerRemediation,
        persistedFileCoverage,
        fileImportEvidenceCoverage,
        systemMapPersistenceCoverage,
        standardizationReport,
        compilerContractLayer,
        runtimeTableHealth,
        semanticCanonicality: canonicalSemanticSurface,
        orphanPipelineFunctions: pipelineOrphanSummary.normalizedOrphans,
        summary: {
            totalIssues: issues.length,
            totalWarnings: warnings.length,
            orphanFunctionsFound: orphanFunctions.length,
            zeroFieldsFound: zeroFields.length,
            suspiciousDeadCandidates,
            recommendation: issues.length > 0
                ? `${issues.length} critical issues detected`
                : warnings.length > 0
                    ? `${warnings.length} warnings detected — compiler telemetry still needs cleanup`
                    : 'Pipeline looks healthy ✅'
        }
    };
}
