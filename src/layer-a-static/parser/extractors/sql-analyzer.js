import { walk } from './utils.js';
import SqlModule from '@derekstride/tree-sitter-sql';

const Sql = SqlModule;

export class SqlAnalyzer {
    constructor(logger) {
        this._logger = logger;
    }

    /**
     * Analiza el AST de una sentencia SQL para extraer metadatos.
     * @param {object} sqlTree - AST de tree-sitter-sql
     * @param {string} rawSql - SQL crudo
     * @returns {{ operation: string, tables: Set<string>, columns: Set<string> }}
     */
    analyze(sqlTree, rawSql) {
        let operation = 'UNKNOWN';
        const tables = new Set();
        const columns = new Set();

        walk(sqlTree.rootNode, [
            'select', 'insert', 'update', 'delete', 'identifier', 'column_name', 'field'
        ], (node) => {
            // Determinar operación principal
            if (operation === 'UNKNOWN') {
                if (node.type === 'select') operation = 'SELECT';
                else if (node.type === 'insert') operation = 'INSERT';
                else if (node.type === 'update') operation = 'UPDATE';
                else if (node.type === 'delete') operation = 'DELETE';
            }

            // Extraer columnas
            if (node.type === 'column_name' || node.type === 'field') {
                const colTxt = rawSql.slice(node.startIndex, node.endIndex).toLowerCase().trim();
                if (this._isValidColumn(colTxt)) {
                    columns.add(colTxt);
                }
            }

            // Extraer tablas/identificadores
            if (node.type === 'identifier') {
                const txt = rawSql.slice(node.startIndex, node.endIndex).toLowerCase();
                if (this._isValidTable(txt, node)) {
                    tables.add(txt);
                }
            }
        });

        if (operation === 'UNKNOWN') {
            operation = this.detectOperationFallback(rawSql);
        }

        return { operation, tables, columns };
    }

    detectOperationFallback(rawSql) {
        const s = rawSql.trim().toUpperCase();
        if (s.startsWith('SELECT') || s.startsWith('WITH')) return 'SELECT';
        if (s.startsWith('INSERT') || s.startsWith('REPLACE INTO') || s.startsWith('REPLACE')) return 'INSERT';
        if (s.startsWith('UPDATE')) return 'UPDATE';
        if (s.startsWith('DELETE')) return 'DELETE';
        if (s.startsWith('PRAGMA')) return 'PRAGMA';
        if (s.startsWith('CREATE') || s.startsWith('DROP') || s.startsWith('ALTER')) return 'DDL';
        if (s.startsWith('BEGIN') || s.startsWith('COMMIT') || s.startsWith('ROLLBACK')) return 'TRANSACTION';
        return 'UNKNOWN';
    }

    classifyPurpose(operation, tables, rawSql, isDynamic = false) {
        const hasDynamicTable = rawSql.includes('_tbl_');
        if (isDynamic && (operation === 'UNKNOWN' || hasDynamicTable)) return 'DYNAMIC_QUERY';

        const sql = rawSql.toUpperCase();
        const tableList = Array.from(tables).join(',');

        // Auth & security
        const authTables = ['users', 'sessions', 'tokens', 'permissions', 'roles', 'auth'];
        if (operation === 'SELECT' && authTables.some(t => tableList.includes(t))) return 'AUTH_CHECK';

        // Audit / logging
        const logTables = ['events', 'logs', 'audit', 'history', 'changelog'];
        if (operation === 'INSERT' && logTables.some(t => tableList.includes(t))) return 'AUDIT_LOG';

        // Schema introspection
        if (operation === 'PRAGMA' || sql.includes('SQLITE_MASTER') || sql.includes('SQLITE_SCHEMA')) return 'SCHEMA_QUERY';

        // DDL
        if (operation === 'DDL') return 'DDL_OPERATION';

        // Transaction control
        if (operation === 'TRANSACTION') return 'TRANSACTION_CONTROL';

        // Aggregation (COUNT, SUM, AVG, GROUP BY)
        if (operation === 'SELECT' && (sql.includes('COUNT(') || sql.includes('SUM(') || sql.includes('AVG(') || sql.includes('GROUP BY'))) return 'AGGREGATION';

        // JOIN traversal
        if (operation === 'SELECT' && sql.includes('JOIN')) return 'RELATIONSHIP_TRAVERSE';

        // Bulk mutation (UPDATE/DELETE without WHERE — full table)
        if ((operation === 'UPDATE' || operation === 'DELETE') && !sql.includes('WHERE')) return 'BULK_MUTATION';

        // Upsert
        if (operation === 'INSERT' && (sql.includes('OR REPLACE') || sql.includes('OR IGNORE') || sql.includes('ON CONFLICT'))) return 'UPSERT';

        // Version/history tracking
        if (tableList.includes('version') || tableList.includes('snapshot') || tableList.includes('migration')) return 'VERSION_TRACKING';

        // Cache refresh pattern (SELECT in read-only helper)
        if (operation === 'SELECT' && tables.size === 1) return 'CACHE_READ';

        // Generic by operation
        if (operation === 'SELECT') return 'DATA_READ';
        if (operation === 'INSERT') return 'DATA_INSERT';
        if (operation === 'UPDATE') return 'DATA_UPDATE';
        if (operation === 'DELETE') return 'DATA_DELETE';

        return 'UNKNOWN_PURPOSE';
    }

    _isValidColumn(colTxt) {
        return colTxt && colTxt.length > 1 && !colTxt.includes('.') && colTxt !== '_tbl_';
    }

    _isValidTable(txt, node) {
        if (txt === '_tbl_') return false;
        const reserved = ['select', 'from', 'where', 'limit', 'join', 'insert', 'into', 'values', 'update', 'set', 'delete'];
        if (txt.length <= 2 || reserved.includes(txt)) return false;

        const pType = node.parent?.type;
        return pType && (pType === 'object_reference' || pType.includes('relation') || pType === 'from' || pType === 'update' || pType === 'insert');
    }
}
