/**
 * Maneja el autodiagnóstico del pipeline (pipeline_health)
 * @param {Object} tool - Instancia de AggregateMetricsTool
 * @returns {Promise<Object>} Resultado del diagnóstico
 */
import {
    buildDeadCodeRemediationPlan,
    buildLiveRowRemediationPlan,
    buildPipelineOrphanRemediationPlan,
    PIPELINE_FIELD_COVERAGE_SIGNALS,
    buildLiveRowReconciliationPlan,
    classifyFieldCoverage,
    getDeadCodePlausibilitySummary,
    getLiveRowDriftSummary,
    getPipelineOrphanSummary,
    scanCompilerPolicyDrift,
    summarizeCompilerPolicyDrift
} from '../../../../shared/compiler/index.js';

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

    const issues = [];
    const warnings = [];
    const {
        liveFileTotal: liveAtomFiles,
        staleFileRows,
        staleRiskRows
    } = getLiveRowDriftSummary(db);

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
            const coverage = classifyFieldCoverage({
                total: scopedTotal,
                nonZeroCount,
                minWarningCoverage,
                description,
                descriptionSuffix
            });
            if (!coverage || coverage.level === 'ok') continue;

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
            const policyFindings = await scanCompilerPolicyDrift(projectPath, { limit: 100 });
            const policySummary = summarizeCompilerPolicyDrift(policyFindings);

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
    const healthScore = Math.max(0, 100 - (issues.length * 15) - (warnings.length * 5));
    const grade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D';

    return {
        healthScore,
        grade,
        tableCounts,
        issues,
        warnings,
        liveRowReconciliation,
        liveRowRemediation,
        deadCodeRemediation,
        pipelineOrphanRemediation,
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
