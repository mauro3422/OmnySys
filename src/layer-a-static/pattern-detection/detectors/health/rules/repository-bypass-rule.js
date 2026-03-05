export class RepositoryBypassRule {
    constructor() {
        this.type = 'sql-repo-bypass';
        this.bypassPurposes = new Set([
            'DATA_READ', 'DATA_INSERT', 'DATA_UPDATE', 'DATA_DELETE',
            'CACHE_READ', 'BULK_MUTATION', 'AGGREGATION', 'UPSERT'
        ]);
    }

    check(findings, filePath, sqlAtoms, { isStorageLayer, createFinding }) {
        if (isStorageLayer) return;

        for (const atom of sqlAtoms) {
            const purpose = atom._meta?.sql_purpose || '';
            if (this.bypassPurposes.has(purpose)) {
                findings.push(createFinding(
                    this.type, 'high', filePath, atom,
                    `Direct DB access outside storage layer — should use getRepository() instead`,
                    { sql_purpose: purpose, suggestion: 'Move to src/layer-c-memory/storage/' }
                ));
            }
        }
    }
}
