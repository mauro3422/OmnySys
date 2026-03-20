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

            const parentKey = atom._meta?.parent_atom_name || atom._meta?.parent_atom_id;
            if (!parentKey) continue;

            const summary = selectsByParent.get(parentKey) || {
                count: 0,
                tables: new Set(),
                firstAtom: atom,
                sqlPurposes: []
            };

            summary.count++;
            summary.sqlPurposes.push(atom._meta?.sql_purpose);
            if (!summary.firstAtom) summary.firstAtom = atom;

            for (const table of atom._meta?.tables_referenced || []) {
                if (!this.ignoredTables.has(table)) {
                    summary.tables.add(table);
                }
            }

            selectsByParent.set(parentKey, summary);
        }

        for (const [parentName, summary] of selectsByParent.entries()) {
            if (summary.count < this.multiSelectThreshold) continue;
            if (summary.tables.size < 2) continue;

            findings.push({
                type: this.type,
                severity: 'medium',
                filePath,
                atomId: summary.firstAtom?.id,
                atomName: parentName,
                line: summary.firstAtom?.lineStart || 0,
                message: `${summary.count} separate SELECTs in '${parentName}' on tables [${[...summary.tables].join(', ')}] — consider JOIN`,
                details: {
                    select_count: summary.count,
                    tables: [...summary.tables],
                    sql_purposes: summary.sqlPurposes
                }
            });
        }
    }
}
