/**
 * Maneja el autodiagnóstico del pipeline (pipeline_health)
 * @param {Object} tool - Instancia de AggregateMetricsTool
 * @returns {Promise<Object>} Resultado del diagnóstico
 */
export async function handlePipelineHealth(tool) {
    const db = tool.repo?.db;
    if (!db) throw new Error('Repository (DB) not available');

    const issues = [];
    const warnings = [];

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

    // --- CHECK 2: Cobertura de campos ---
    const suspiciousFields = [
        { field: 'centrality_score', description: 'persistGraphMetrics() not connected' },
        { field: 'age_days', description: 'Git integration missing for age_days' },
        { field: 'change_frequency', description: 'Git integration missing for change_frequency' },
        { field: 'has_network_calls', description: 'Network call detector not covering Node.js patterns' },
    ];

    const zeroFields = [];
    const atomTotal = tableCounts['atoms'] || 1;
    for (const { field, description } of suspiciousFields) {
        try {
            const row = db.prepare(
                `SELECT SUM(CASE WHEN ${field} != 0 AND ${field} IS NOT NULL THEN 1 ELSE 0 END) as nonzero FROM atoms`
            ).get();
            const nonZeroCount = row?.nonzero || 0;
            const coveragePct = Math.round((nonZeroCount / atomTotal) * 100);
            if (coveragePct === 0) {
                issues.push({ field, coverage: '0%', nonZeroCount, issue: description });
                zeroFields.push(field);
            } else if (coveragePct < 5) {
                warnings.push({ field, coverage: `${coveragePct}%`, nonZeroCount, issue: `Very low coverage — ${description}` });
            }
        } catch (e) { /* field missing */ }
    }

    // --- CHECK 3: Pipeline orphans ---
    const pipelinePatterns = ['persist', 'analyze', 'compute', 'calculate', 'build', 'generate', 'process', 'index'];
    const patternCondition = pipelinePatterns.map(p => `name LIKE '%${p}%'`).join(' OR ');
    const orphanFunctions = db.prepare(`
        SELECT id, name, file_path, callers_count, complexity
        FROM atoms
        WHERE is_exported = 1 
          AND callers_count = 0
          AND atom_type IN ('function', 'arrow', 'method')
          AND is_test_callback = 0
          AND (${patternCondition})
          AND complexity > 3
        ORDER BY complexity DESC
        LIMIT 20
    `).all();

    const healthScore = Math.max(0, 100 - (issues.length * 15) - (warnings.length * 5));
    const grade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D';

    return {
        healthScore,
        grade,
        tableCounts,
        issues,
        warnings,
        orphanPipelineFunctions: orphanFunctions.map(f => ({
            name: f.name,
            file: f.file_path,
            complexity: f.complexity,
            diagnosis: 'Exported pipeline function with 0 callers — likely disconnected'
        })),
        summary: {
            totalIssues: issues.length,
            totalWarnings: warnings.length,
            orphanFunctionsFound: orphanFunctions.length,
            zeroFieldsFound: zeroFields.length,
            recommendation: issues.length === 0
                ? 'Pipeline looks healthy ✅'
                : `${issues.length} critical issues detected`
        }
    };
}
