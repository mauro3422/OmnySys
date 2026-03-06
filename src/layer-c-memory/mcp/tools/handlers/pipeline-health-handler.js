/**
 * Maneja el autodiagnóstico del pipeline (pipeline_health)
 * @param {Object} tool - Instancia de AggregateMetricsTool
 * @returns {Promise<Object>} Resultado del diagnóstico
 */
function getEffectiveCallerCount(atomRow) {
    if ((atomRow?.callers_count || 0) > 0) {
        return atomRow.callers_count;
    }

    if (!atomRow?.called_by_json || atomRow.called_by_json === '[]') {
        return 0;
    }

    try {
        const parsed = JSON.parse(atomRow.called_by_json);
        return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
        return 0;
    }
}

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

    const desyncedCallerCounts = db.prepare(`
        SELECT COUNT(*) as total
        FROM atoms
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
    const suspiciousFields = [
        { field: 'centrality_score', description: 'persistGraphMetrics() not connected', minWarningCoverage: 5 },
        { field: 'age_days', description: 'Git integration missing for age_days', minWarningCoverage: 5 },
        { field: 'change_frequency', description: 'Git integration missing for change_frequency', minWarningCoverage: 5 },
        { field: 'has_network_calls', description: 'Network call detector coverage appears low', minWarningCoverage: 1 },
    ];

    const zeroFields = [];
    for (const { field, description, minWarningCoverage = 5 } of suspiciousFields) {
        try {
            const { whereClause, descriptionSuffix } = getFieldCoverageContext(field);
            const denominatorRow = db.prepare(`SELECT COUNT(*) as total FROM atoms ${whereClause}`).get();
            const scopedTotal = denominatorRow?.total || 0;
            if (scopedTotal === 0) continue;

            const row = db.prepare(
                `SELECT SUM(CASE WHEN ${field} != 0 AND ${field} IS NOT NULL THEN 1 ELSE 0 END) as nonzero FROM atoms ${whereClause}`
            ).get();
            const nonZeroCount = row?.nonzero || 0;
            const coveragePct = Math.round((nonZeroCount / scopedTotal) * 100);
            if (coveragePct === 0) {
                issues.push({ field, coverage: '0%', nonZeroCount, issue: `${description}${descriptionSuffix}` });
                zeroFields.push(field);
            } else if (coveragePct < minWarningCoverage) {
                warnings.push({ field, coverage: `${coveragePct}%`, nonZeroCount, issue: `Very low coverage — ${description}${descriptionSuffix}` });
            }
        } catch (e) { /* field missing */ }
    }

    // --- CHECK 3: Pipeline orphans ---
    const pipelinePatterns = ['persist', 'analyze', 'compute', 'calculate', 'build', 'generate', 'process', 'index'];
    const patternCondition = pipelinePatterns.map(p => `name LIKE '%${p}%'`).join(' OR ');
    const potentialOrphans = db.prepare(`
        SELECT id, name, file_path, atom_type, callers_count, called_by_json, complexity, is_phase2_complete
        FROM atoms
        WHERE is_exported = 1
          AND atom_type IN ('function', 'arrow', 'method', 'class')
          AND is_test_callback = 0
          AND is_phase2_complete = 1
          AND (${patternCondition})
          AND complexity > 3
        ORDER BY complexity DESC
        LIMIT 50
    `).all();

    const orphanFunctions = potentialOrphans
        .filter(atom => getEffectiveCallerCount(atom) === 0)
        .slice(0, 20);

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
            diagnosis: 'Exported pipeline atom with no effective callers — likely disconnected'
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
