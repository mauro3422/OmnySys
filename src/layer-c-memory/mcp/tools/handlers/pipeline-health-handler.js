/**
 * Maneja el autodiagnóstico del pipeline (pipeline_health)
 * @param {Object} tool - Instancia de AggregateMetricsTool
 * @returns {Promise<Object>} Resultado del diagnóstico
 */
import {
    buildCompilerRemediationBacklog,
    buildCompilerStandardizationReport,
    summarizeCentralityCoverageRow,
    buildDeadCodeRemediationPlan,
    buildLiveRowRemediationPlan,
    buildDuplicateRemediationPlan,
    buildPipelineOrphanRemediationPlan,
    PIPELINE_FIELD_COVERAGE_SIGNALS,
    buildLiveRowReconciliationPlan,
    classifyFieldCoverage,
    discoverProjectSourceFiles,
    ensureLiveRowSync,
    getFileImportEvidenceCoverage,
    getLiveFileTotal,
    getMetadataSurfaceParity,
    getSemanticSurfaceGranularity,
    summarizeSemanticCanonicality,
    getSystemMapPersistenceCoverage,
    getDeadCodePlausibilitySummary,
    getPipelineOrphanSummary,
    scanCompilerPolicyDrift,
    syncPersistedScannedFileManifest,
    summarizeCompilerPolicyDrift,
    summarizePersistedScannedFileCoverage
} from '../../../../shared/compiler/index.js';
import { syncRuntimeTableHealthIssues } from '../../../../core/diagnostics/runtime-table-health.js';

function getFieldCoverageContext(field) {
    if (field === 'has_network_calls') {
        return {
            whereClause: 'WHERE is_phase2_complete = 1',
            descriptionSuffix: ' (Phase 2 atoms only)'
        };
    }

    return {
        whereClause: '',
        descriptionSuffix: ''
    };
}

export async function handlePipelineHealth(tool) {
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
    const {
        liveFileTotal: liveAtomFiles = 0,
        staleFileRows = 0,
        staleRiskRows = 0
    } = liveRowSync.summary || {};

    // --- CHECK 1: Tablas vacías ---
    const expectedNonEmpty = [
        { table: 'atoms', minRows: 100, description: 'No atoms indexed — pipeline never ran?' },
        { table: 'atom_relations', minRows: 1, description: 'No relations — call graph not built' },
        { table: 'files', minRows: 1, description: 'No files indexed' },
        { table: 'atom_versions', minRows: 1, description: 'atom_versions empty — AtomVersionManager.trackAtomVersion() not called' },
        { table: 'atom_events', minRows: 1, description: 'atom_events empty — no activity tracked' },
        { table: 'societies', minRows: 1, description: 'societies empty — analyzeSocieties() not running' },
        { table: 'risk_assessments', minRows: 0, description: 'risk_assessments empty — risk pipeline missing', severity: 'warning' },
        { table: 'semantic_issues', minRows: 0, description: 'semantic_issues empty — semantic analysis missing', severity: 'warning' },
    ];

    const tableCounts = {};
    for (const check of expectedNonEmpty) {
        try {
            const row = db.prepare(`SELECT COUNT(*) as c FROM "${check.table}"`).get();
            tableCounts[check.table] = row?.c || 0;
            if (row?.c < check.minRows) {
                const entry = { table: check.table, rows: row?.c || 0, issue: check.description };
                if (check.severity === 'warning') warnings.push(entry);
                else issues.push(entry);
            }
        } catch (e) {
            issues.push({ table: check.table, rows: null, issue: `Table missing or inaccessible: ${e.message}` });
        }
    }

    tableCounts.live_atom_files = liveAtomFiles;
    tableCounts.stale_file_rows = staleFileRows;
    tableCounts.stale_risk_rows = staleRiskRows;
    tableCounts.live_row_sync_deleted =
        (liveRowSync.deleted?.files || 0) +
        (liveRowSync.deleted?.riskAssessments || 0) +
        (liveRowSync.deleted?.relations || 0) +
        (liveRowSync.deleted?.issues || 0) +
        (liveRowSync.deleted?.connections || 0);

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

    // --- CHECK 2: Cobertura de campos ---
    const zeroFields = [];
    for (const { field, description, minWarningCoverage = 5 } of PIPELINE_FIELD_COVERAGE_SIGNALS) {
        try {
            const { whereClause, descriptionSuffix } = getFieldCoverageContext(field);
            const denominatorRow = db.prepare(`SELECT COUNT(*) as total FROM atoms ${whereClause}`).get();
            const scopedTotal = denominatorRow?.total || 0;
            if (scopedTotal === 0) continue;

            const row = db.prepare(
                `SELECT SUM(CASE WHEN ${field} != 0 AND ${field} IS NOT NULL THEN 1 ELSE 0 END) as nonzero FROM atoms ${whereClause}`
            ).get();
            const nonZeroCount = row?.nonzero || 0;
            const coverage = field === 'centrality_score'
                ? summarizeCentralityCoverageRow({
                    total: scopedTotal,
                    centrality_nonzero: nonZeroCount
                }, {
                    minWarningCoverage,
                    description,
                    descriptionSuffix
                })?.classification
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
        } catch (e) { /* field missing */ }
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

    // --- CHECK 5: Compiler policy drift ---
    if (projectPath) {
        try {
            policyFindings = await scanCompilerPolicyDrift(projectPath, { limit: 100 });
            policySummary = summarizeCompilerPolicyDrift(policyFindings);

            if (policySummary.total > 0) {
                warnings.push({
                    field: 'compiler_policy',
                    coverage: `${policySummary.total} findings`,
                    issue: 'Compiler policy drift detected — some MCP/watcher paths still recompute canonical signals manually'
                });

                if (policySummary.high > 0) {
                    issues.push({
                        field: 'compiler_policy_high',
                        coverage: `${policySummary.high} high`,
                        issue: 'High-severity compiler policy drift found in core runtime modules'
                    });
                }

                tableCounts.compiler_policy_findings = policySummary.total;
                tableCounts.compiler_policy_high = policySummary.high;
            }

            tableCounts.compiler_policy_areas = Object.keys(policySummary.byPolicyArea || {}).length;
        } catch (error) {
            warnings.push({
                field: 'compiler_policy',
                coverage: 'unknown',
                issue: `Could not scan compiler policy drift: ${error.message}`
            });
        }
    }

    const liveRowReconciliation = buildLiveRowReconciliationPlan(db, { sampleLimit: 5 });
    const liveRowRemediation = buildLiveRowRemediationPlan(db, { sampleLimit: 5 });
    const duplicateGroups = db.prepare(`
        SELECT dna_json as duplicate_key, COUNT(*) as group_size
        FROM atoms
        WHERE dna_json IS NOT NULL AND dna_json != '' AND dna_json != 'null'
          AND atom_type IN ('function', 'arrow')
          AND file_path LIKE 'src/%'
        GROUP BY dna_json
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT 10
    `).all().map((row) => ({
        groupSize: row.group_size,
        urgencyScore: row.group_size,
        instances: []
    }));
    const duplicateRemediation = buildDuplicateRemediationPlan(duplicateGroups);
    const metadataSurfaceParity = getMetadataSurfaceParity(db);
    if (metadataSurfaceParity.healthy === false) {
        warnings.push({
            field: 'metadata_surface_parity',
            coverage: `${Math.round(Number(metadataSurfaceParity.importsParityRatio || 0) * 100)}% import parity`,
            issue: 'Mirrored system-map metadata is much sparser than the primary files table'
        });
        tableCounts.metadata_surface_parity_issues = metadataSurfaceParity.issues.length;
    }
    const semanticSurfaceGranularity = getSemanticSurfaceGranularity(db);
    const semanticCanonicality = summarizeSemanticCanonicality(semanticSurfaceGranularity);
    if (semanticSurfaceGranularity.healthy === false) {
        warnings.push({
            field: 'semantic_surface_granularity',
            coverage: `${semanticSurfaceGranularity.fileLevel.total} file-level vs ${semanticSurfaceGranularity.atomLevel.total} atom-level semantic links`,
            issue: 'Semantic summary/detail surfaces are drifting or incomplete; do not compare file-level semantic_connections as if they were atom-level semantic relations'
        });
        tableCounts.semantic_surface_granularity_issues = semanticSurfaceGranularity.issues.length;
    }
    if (semanticCanonicality?.status === 'advisory_only') {
        warnings.push({
            field: 'semantic_surface_canonicality',
            coverage: `${semanticSurfaceGranularity.fileLevel.total} summary rows backed by ${semanticSurfaceGranularity.canonicalAdapterView.total} canonical file-level pairs`,
            issue: semanticCanonicality.summary
        });
    }
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
    const scannedFilePaths = await discoverProjectSourceFiles(projectPath);
    await syncPersistedScannedFileManifest(projectPath, scannedFilePaths);
    const persistedFileCoverage = await summarizePersistedScannedFileCoverage(projectPath, scannedFilePaths);
    const fileImportEvidenceCoverage = getFileImportEvidenceCoverage(db);
    const systemMapPersistenceCoverage = getSystemMapPersistenceCoverage(db);
    const standardizationReport = buildCompilerStandardizationReport({
        policySummary,
        watcherAlerts: recentWatcherAlerts,
        sharedState: tool.server?.sharedCache?.metadata?.sharedState || tool.server?.sharedState || {},
        compilerRemediation,
        persistedFileCoverage,
        fileImportEvidenceCoverage,
        systemMapPersistenceCoverage,
        semanticCanonicality,
        semanticSurfaceGranularity,
        fileUniverseGranularity: {
            scannedFileTotal: persistedFileCoverage.scannedFileTotal,
            manifestFileTotal: persistedFileCoverage.manifestFileTotal,
            liveFileCount: getLiveFileTotal(db)
        },
        canonicalAdoptions: {
            centralityCoverage: true,
            sharedStateContention: true,
            scannedFileManifest: persistedFileCoverage.synchronized
        }
    });
    const healthScore = Math.max(0, 100 - (issues.length * 15) - (warnings.length * 5));
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
        runtimeTableHealth,
        semanticCanonicality,
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
