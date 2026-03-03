/**
 * @fileoverview sql-patterns-detector.js
 *
 * Detector de anti-patrones SQL usando sql_purpose + sql_operation + context.
 * Detecta: SELECT *, BULK_MUTATION sin WHERE, múltiples mutations sin transacción,
 * N+1 risk, átomos SQL huérfanos (en funciones dead-code), y densidad excesiva.
 *
 * @module pattern-detection/detectors/sql-patterns-detector
 */

export class SqlPatternsDetector {
    constructor({ config = {}, globalConfig = {} } = {}) {
        this.config = {
            queryDensityThreshold: config.queryDensityThreshold || 10,
            n1ComplexityThreshold: config.n1ComplexityThreshold || 5,
            multiMutationThreshold: config.multiMutationThreshold || 2,
            ...config
        };
    }

    async detect(systemMap) {
        const findings = [];
        const files = systemMap?.files || {};

        for (const [filePath, fileData] of Object.entries(files)) {
            const allAtoms = fileData?.atoms || [];
            const sqlAtoms = allAtoms.filter(a => a.type === 'sql_query');
            if (sqlAtoms.length === 0) continue;

            const jsAtomsByName = new Map(allAtoms
                .filter(a => a.type !== 'sql_query')
                .map(a => [a.name, a]));

            // 1: SELECT * usage
            for (const atom of sqlAtoms) {
                const raw = (atom._meta?.raw_sql || '').toUpperCase();
                if (raw.includes('SELECT *') || raw.includes('SELECT  *')) {
                    findings.push(this._finding('sql-select-star', 'medium', filePath, atom,
                        `SELECT * detected — fetches all columns, prevents index-only scans`,
                        { sql_purpose: atom._meta?.sql_purpose, parent: atom._meta?.parent_atom_name }
                    ));
                }
            }

            // 2: BULK_MUTATION (UPDATE/DELETE without WHERE)
            for (const atom of sqlAtoms) {
                if (atom._meta?.sql_purpose === 'BULK_MUTATION') {
                    findings.push(this._finding('sql-bulk-mutation', 'high', filePath, atom,
                        `${atom._meta.sql_operation} without WHERE clause — modifies ALL rows in table`,
                        { tables: atom._meta?.tables_referenced }
                    ));
                }
            }

            // 3: Multiple mutations in same parent without TRANSACTION
            const mutationsByParent = {};
            for (const atom of sqlAtoms) {
                const pid = atom._meta?.parent_atom_id || atom._meta?.parent_atom_name;
                if (!pid) continue;
                const op = atom._meta?.sql_operation;
                if (op === 'INSERT' || op === 'UPDATE' || op === 'DELETE') {
                    if (!mutationsByParent[pid]) mutationsByParent[pid] = [];
                    mutationsByParent[pid].push(atom);
                }
            }
            // Check if there's a TRANSACTION atom in same parent
            const transactionAtoms = sqlAtoms.filter(a => a._meta?.sql_purpose === 'TRANSACTION_CONTROL');
            const parentHasTransaction = new Set(transactionAtoms.map(a => a._meta?.parent_atom_id));
            for (const [parentId, mutations] of Object.entries(mutationsByParent)) {
                if (mutations.length >= this.config.multiMutationThreshold && !parentHasTransaction.has(parentId)) {
                    const parentAtom = [...jsAtomsByName.values()].find(a => a.id === parentId || a.name === parentId);
                    findings.push(this._finding('sql-missing-transaction', 'high', filePath, mutations[0],
                        `${mutations.length} mutations in '${parentAtom?.name || parentId}' without transaction — data integrity risk on crash`,
                        { mutation_count: mutations.length, operations: mutations.map(a => a._meta?.sql_operation) }
                    ));
                }
            }

            // 4: N+1 risk — SQL atom inside high-complexity parent
            for (const atom of sqlAtoms) {
                const parentName = atom._meta?.parent_atom_name;
                if (!parentName) continue;
                const parent = jsAtomsByName.get(parentName);
                if (parent && (parent.complexity || 1) >= this.config.n1ComplexityThreshold) {
                    const op = atom._meta?.sql_operation;
                    if (op === 'SELECT' || op === 'INSERT') {
                        findings.push(this._finding('sql-n1-risk', 'high', filePath, atom,
                            `SQL ${op} inside high-complexity '${parentName}' (complexity:${parent.complexity}) — likely N+1 pattern`,
                            { parent_complexity: parent.complexity, sql_purpose: atom._meta?.sql_purpose }
                        ));
                    }
                }
            }

            // 5: Dead SQL — SQL in truly_dead parent
            for (const atom of sqlAtoms) {
                const parentName = atom._meta?.parent_atom_name;
                if (!parentName) continue;
                const parent = jsAtomsByName.get(parentName);
                if (parent?.callerPattern?.id === 'truly_dead' || parent?.isDeadCode) {
                    findings.push(this._finding('sql-dead-query', 'medium', filePath, atom,
                        `SQL query in dead function '${parentName}' — never executed but still in codebase`,
                        { sql_purpose: atom._meta?.sql_purpose, tables: atom._meta?.tables_referenced }
                    ));
                }
            }

            // 6: Query density
            if (sqlAtoms.length >= this.config.queryDensityThreshold) {
                const purposes = [...new Set(sqlAtoms.map(a => a._meta?.sql_purpose).filter(Boolean))];
                findings.push({
                    type: 'sql-query-density', severity: 'medium', filePath,
                    atomId: null, atomName: null, line: 0,
                    message: `${sqlAtoms.length} SQL queries in one file — extract a dedicated repository module`,
                    details: { sql_count: sqlAtoms.length, sql_purposes: purposes }
                });
            }
        }

        const highCount = findings.filter(f => f.severity === 'high').length;
        const medCount = findings.filter(f => f.severity === 'medium').length;
        const score = Math.max(0, 100 - highCount * 8 - medCount * 3);

        return {
            detector: 'sql-patterns',
            findings,
            score,
            summary: {
                selectStar: findings.filter(f => f.type === 'sql-select-star').length,
                bulkMutation: findings.filter(f => f.type === 'sql-bulk-mutation').length,
                missingTransaction: findings.filter(f => f.type === 'sql-missing-transaction').length,
                n1Risk: findings.filter(f => f.type === 'sql-n1-risk').length,
                deadQuery: findings.filter(f => f.type === 'sql-dead-query').length,
                queryDensity: findings.filter(f => f.type === 'sql-query-density').length,
                totalFindings: findings.length
            }
        };
    }

    _finding(type, severity, filePath, atom, message, details = {}) {
        return {
            type, severity, filePath,
            atomId: atom.id,
            atomName: atom.name,
            line: atom.lineStart || atom.line || 0,
            message,
            details: { sql_purpose: atom._meta?.sql_purpose, ...details }
        };
    }
}

export default SqlPatternsDetector;
