export class DynamicStorageRule {
    constructor() {
        this.type = 'sql-dynamic-in-storage';
    }

    check(findings, filePath, sqlAtoms, { isStorageLayer, createFinding }) {
        if (!isStorageLayer) return;

        for (const atom of sqlAtoms) {
            if (atom._meta?.sql_purpose === 'DYNAMIC_QUERY' && !atom._meta?.sql_injection_risk) {
                findings.push(createFinding(
                    this.type, 'medium', filePath, atom,
                    `Dynamic query in storage layer — table name resolved at runtime, consider making it static`,
                    {
                        template_vars: atom._meta?.template_vars,
                        resolved: atom._meta?.resolved_tables_from_vars
                    }
                ));
            }
        }
    }
}
