export function loadExpectedPipelineTableCounts(db) {
    const expectedNonEmpty = [
        { table: 'atoms', minRows: 100, description: 'No atoms indexed — pipeline never ran?' },
        { table: 'atom_relations', minRows: 1, description: 'No relations — call graph not built' },
        { table: 'files', minRows: 1, description: 'No files indexed' },
        { table: 'atom_versions', minRows: 1, description: 'atom_versions empty — AtomVersionManager.trackAtomVersion() not called' },
        { table: 'atom_events', minRows: 1, description: 'atom_events empty — no activity tracked' },
        { table: 'societies', minRows: 1, description: 'societies empty — analyzeSocieties() not running' },
        { table: 'risk_assessments', minRows: 0, description: 'risk_assessments empty — risk pipeline missing', severity: 'warning' },
        { table: 'semantic_issues', minRows: 0, description: 'semantic_issues empty — semantic analysis missing', severity: 'warning' }
    ];
    const tableCounts = {};
    const issues = [];
    const warnings = [];

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

    return { tableCounts, issues, warnings };
}

export function buildLiveRowTableCounts(liveRowSync) {
    const {
        liveFileTotal: liveAtomFiles = 0,
        staleFileRows = 0,
        staleRiskRows = 0
    } = liveRowSync.summary || {};

    return {
        liveAtomFiles,
        staleFileRows,
        staleRiskRows,
        deletedCount:
            (liveRowSync.deleted?.files || 0) +
            (liveRowSync.deleted?.riskAssessments || 0) +
            (liveRowSync.deleted?.relations || 0) +
            (liveRowSync.deleted?.issues || 0) +
            (liveRowSync.deleted?.connections || 0)
    };
}
