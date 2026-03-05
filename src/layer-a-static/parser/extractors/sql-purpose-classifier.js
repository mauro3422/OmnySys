export class SqlPurposeClassifier {
    classify(operation, tables, rawSql, isDynamic = false) {
        const hasDynamicTable = rawSql.includes('_tbl_');
        if (isDynamic && (operation === 'UNKNOWN' || hasDynamicTable)) return 'DYNAMIC_QUERY';

        const sql = rawSql.toUpperCase();
        const tableList = Array.from(tables).join(',');

        // Mapping rules
        if (this._isAuth(operation, tableList)) return 'AUTH_CHECK';
        if (this._isAudit(operation, tableList)) return 'AUDIT_LOG';
        if (this._isSchema(operation, sql)) return 'SCHEMA_QUERY';
        if (operation === 'DDL') return 'DDL_OPERATION';
        if (operation === 'TRANSACTION') return 'TRANSACTION_CONTROL';
        if (this._isAggregation(operation, sql)) return 'AGGREGATION';
        if (operation === 'SELECT' && sql.includes('JOIN')) return 'RELATIONSHIP_TRAVERSE';
        if (this._isBulkMutation(operation, sql)) return 'BULK_MUTATION';
        if (this._isUpsert(operation, sql)) return 'UPSERT';
        if (this._isVersionTracking(tableList)) return 'VERSION_TRACKING';
        if (operation === 'SELECT' && tables.size === 1) return 'CACHE_READ';

        // Generic fallback
        return this._genericFallback(operation);
    }

    _isAuth(op, tableList) {
        const authTables = ['users', 'sessions', 'tokens', 'permissions', 'roles', 'auth'];
        return op === 'SELECT' && authTables.some(t => tableList.includes(t));
    }

    _isAudit(op, tableList) {
        const logTables = ['events', 'logs', 'audit', 'history', 'changelog'];
        return op === 'INSERT' && logTables.some(t => tableList.includes(t));
    }

    _isSchema(op, sql) {
        return op === 'PRAGMA' || sql.includes('SQLITE_MASTER') || sql.includes('SQLITE_SCHEMA');
    }

    _isAggregation(op, sql) {
        return op === 'SELECT' && (sql.includes('COUNT(') || sql.includes('SUM(') || sql.includes('AVG(') || sql.includes('GROUP BY'));
    }

    _isBulkMutation(op, sql) {
        return (op === 'UPDATE' || op === 'DELETE') && !sql.includes('WHERE');
    }

    _isUpsert(op, sql) {
        return op === 'INSERT' && (sql.includes('OR REPLACE') || sql.includes('OR IGNORE') || sql.includes('ON CONFLICT'));
    }

    _isVersionTracking(tableList) {
        return tableList.includes('version') || tableList.includes('snapshot') || tableList.includes('migration');
    }

    _genericFallback(op) {
        const map = { 'SELECT': 'DATA_READ', 'INSERT': 'DATA_INSERT', 'UPDATE': 'DATA_UPDATE', 'DELETE': 'DATA_DELETE' };
        return map[op] || 'UNKNOWN_PURPOSE';
    }
}
