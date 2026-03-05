import { SqlSyntaxExtractor } from './sql-syntax-extractor.js';
import { SqlPurposeClassifier } from './sql-purpose-classifier.js';

export class SqlAnalyzer {
    constructor(logger) {
        this._logger = logger;
        this._extractor = new SqlSyntaxExtractor();
        this._classifier = new SqlPurposeClassifier();
    }

    analyze(sqlTree, rawSql) {
        let result = this._extractor.extract(sqlTree, rawSql);

        if (result.operation === 'UNKNOWN') {
            result.operation = this.detectOperationFallback(rawSql);
        }

        return result;
    }

    detectOperationFallback(rawSql) {
        const s = rawSql.trim().toUpperCase();
        if (s.startsWith('SELECT') || s.startsWith('WITH')) return 'SELECT';
        if (s.startsWith('INSERT') || s.startsWith('REPLACE')) return 'INSERT';
        if (s.startsWith('UPDATE')) return 'UPDATE';
        if (s.startsWith('DELETE')) return 'DELETE';
        if (s.startsWith('PRAGMA')) return 'PRAGMA';
        if (s.startsWith('CREATE') || s.startsWith('DROP') || s.startsWith('ALTER')) return 'DDL';
        if (s.startsWith('BEGIN') || s.startsWith('COMMIT') || s.startsWith('ROLLBACK')) return 'TRANSACTION';
        return 'UNKNOWN';
    }

    classifyPurpose(operation, tables, rawSql, isDynamic = false) {
        return this._classifier.classify(operation, tables, rawSql, isDynamic);
    }
}
