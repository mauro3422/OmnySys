export class JoinCandidateRule {
    constructor(config = {}) {
        this.type = 'sql-join-candidate';
        this.multiSelectThreshold = config.multiSelectThreshold || 2;
        this.ignoredTables = new Set([
            'count', 'system_files', 'semantic_connections',
            'risk_assessments', 'file_dependencies', 'sqlite_master',
            'system_metadata', 'changes', 'max', 'min'
        ]);
    }

    check(findings, filePath, sqlAtoms) {
        const selectsByParent = new Map();

        for (const atom of sqlAtoms) {
            if (atom._meta?.sql_operation !== 'SELECT') continue;
            const pid = atom._meta?.parent_atom_name || atom._meta?.parent_atom_id;
            if (!pid) continue;

            if (!selectsByParent.has(pid)) selectsByParent.set(pid, []);
            selectsByParent.get(pid).push(atom);
        }

        for (const [parentName, selects] of selectsByParent.entries()) {
            if (selects.length < this.multiSelectThreshold) continue;

            const uniqueTables = new Set(selects.flatMap(s => s._meta?.tables_referenced || []));
            for (const ignored of this.ignoredTables) uniqueTables.delete(ignored);

            if (uniqueTables.size < 2) continue;

            findings.push({
                type: this.type,
                severity: 'medium',
                filePath,
                atomId: selects[0].id,
                atomName: parentName,
                line: selects[0].lineStart || 0,
                message: `${selects.length} separate SELECTs in '${parentName}' on tables [${[...uniqueTables].join(', ')}] — consider JOIN`,
                details: {
                    select_count: selects.length,
                    tables: [...uniqueTables],
                    sql_purposes: selects.map(s => s._meta?.sql_purpose)
                }
            });
        }
    }
}
