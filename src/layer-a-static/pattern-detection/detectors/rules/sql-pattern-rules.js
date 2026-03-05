export class SelectStarRule {
    constructor() {
        this.type = 'sql-select-star';
    }

    check(findings, filePath, sqlAtoms, { createFinding }) {
        for (const atom of sqlAtoms) {
            const raw = (atom._meta?.raw_sql || '').toUpperCase();
            if (raw.includes('SELECT *') || raw.includes('SELECT  *')) {
                findings.push(createFinding(
                    this.type, 'medium', filePath, atom,
                    `SELECT * detected — fetches all columns, prevents index-only scans`,
                    { parent: atom._meta?.parent_atom_name }
                ));
            }
        }
    }
}

export class BulkMutationRule {
    constructor() {
        this.type = 'sql-bulk-mutation';
    }

    check(findings, filePath, sqlAtoms, { createFinding }) {
        for (const atom of sqlAtoms) {
            if (atom._meta?.sql_purpose === 'BULK_MUTATION') {
                findings.push(createFinding(
                    this.type, 'high', filePath, atom,
                    `${atom._meta?.sql_operation} without WHERE clause — modifies ALL rows in table`,
                    { tables: atom._meta?.tables_referenced }
                ));
            }
        }
    }
}

export class MissingTransactionRule {
    constructor(config = {}) {
        this.type = 'sql-missing-transaction';
        this.multiMutationThreshold = config.multiMutationThreshold || 2;
    }

    check(findings, filePath, sqlAtoms, { createFinding, jsAtomsById, jsAtomsByName }) {
        const mutationsByParent = new Map();
        const parentHasTransaction = new Set();

        for (const atom of sqlAtoms) {
            const sqlOp = atom._meta?.sql_operation;
            const sqlPurpose = atom._meta?.sql_purpose;
            const parentId = atom._meta?.parent_atom_id || atom._meta?.parent_atom_name;

            if ((sqlOp === 'INSERT' || sqlOp === 'UPDATE' || sqlOp === 'DELETE') && parentId) {
                if (!mutationsByParent.has(parentId)) mutationsByParent.set(parentId, []);
                mutationsByParent.get(parentId).push(atom);
            }

            if (sqlPurpose === 'TRANSACTION_CONTROL' && parentId) {
                parentHasTransaction.add(parentId);
            }
        }

        for (const [parentId, mutations] of mutationsByParent.entries()) {
            if (mutations.length >= this.multiMutationThreshold && !parentHasTransaction.has(parentId)) {
                const parentAtom = jsAtomsById.get(parentId) || jsAtomsByName.get(parentId);
                findings.push(createFinding(
                    this.type, 'high', filePath, mutations[0],
                    `${mutations.length} mutations in '${parentAtom?.name || parentId}' without transaction — data integrity risk on crash`,
                    { mutation_count: mutations.length, operations: mutations.map(a => a._meta?.sql_operation) }
                ));
            }
        }
    }
}

export class N1RiskRule {
    constructor(config = {}) {
        this.type = 'sql-n1-risk';
        this.n1ComplexityThreshold = config.n1ComplexityThreshold || 5;
    }

    check(findings, filePath, sqlAtoms, { createFinding, jsAtomsByName }) {
        for (const atom of sqlAtoms) {
            const parentName = atom._meta?.parent_atom_name;
            if (!parentName) continue;

            const parent = jsAtomsByName.get(parentName);
            if (parent && (parent.complexity || 1) >= this.n1ComplexityThreshold) {
                const sqlOp = atom._meta?.sql_operation;
                if (sqlOp === 'SELECT' || sqlOp === 'INSERT') {
                    findings.push(createFinding(
                        this.type, 'high', filePath, atom,
                        `SQL ${sqlOp} inside high-complexity '${parentName}' (complexity:${parent.complexity}) — likely N+1 pattern`,
                        { parent_complexity: parent.complexity }
                    ));
                }
            }
        }
    }
}

export class DeadSqlQueryRule {
    constructor() {
        this.type = 'sql-dead-query';
    }

    check(findings, filePath, sqlAtoms, { createFinding, jsAtomsByName }) {
        for (const atom of sqlAtoms) {
            const parentName = atom._meta?.parent_atom_name;
            if (!parentName) continue;

            const parent = jsAtomsByName.get(parentName);
            if (parent?.callerPattern?.id === 'truly_dead' || parent?.isDeadCode) {
                findings.push(createFinding(
                    this.type, 'medium', filePath, atom,
                    `SQL query in dead function '${parentName}' — never executed but still in codebase`,
                    { tables: atom._meta?.tables_referenced }
                ));
            }
        }
    }
}

export class QueryDensityRule {
    constructor(config = {}) {
        this.type = 'sql-query-density';
        this.queryDensityThreshold = config.queryDensityThreshold || 10;
    }

    check(findings, filePath, sqlAtoms) {
        if (sqlAtoms.length >= this.queryDensityThreshold) {
            findings.push({
                type: this.type,
                severity: 'medium',
                filePath,
                atomId: null,
                atomName: null,
                line: 0,
                message: `${sqlAtoms.length} SQL queries in one file — extract a dedicated repository module`,
                details: { sql_count: sqlAtoms.length }
            });
        }
    }
}
