import {
    SelectStarRule, BulkMutationRule, MissingTransactionRule,
    N1RiskRule, DeadSqlQueryRule, QueryDensityRule
} from './rules/sql-pattern-rules.js';

/**
 * Detector de anti-patrones SQL usando sql_purpose + sql_operation + context.
 */
export class SqlPatternsDetector {
    constructor({ config = {} } = {}) {
        this.config = {
            queryDensityThreshold: config.queryDensityThreshold || 10,
            n1ComplexityThreshold: config.n1ComplexityThreshold || 5,
            multiMutationThreshold: config.multiMutationThreshold || 2,
            ...config
        };
        this._initRules();
    }

    _initRules() {
        this.rules = [
            new SelectStarRule(),
            new BulkMutationRule(),
            new MissingTransactionRule(this.config),
            new N1RiskRule(this.config),
            new DeadSqlQueryRule(),
            new QueryDensityRule(this.config)
        ];
    }

    async detect(systemMap) {
        const findings = [];
        const files = systemMap?.files || {};

        const jsAtomsByName = new Map();
        const jsAtomsById = new Map();

        // Map all once
        for (const fileData of Object.values(files)) {
            for (const atom of (fileData?.atoms || [])) {
                if (atom.type !== 'sql_query') {
                    jsAtomsByName.set(atom.name, atom);
                    jsAtomsById.set(atom.id, atom);
                }
            }
        }

        for (const [filePath, fileData] of Object.entries(files)) {
            const allAtoms = fileData?.atoms || [];
            const sqlAtoms = allAtoms.filter(a => a.type === 'sql_query');
            if (sqlAtoms.length === 0) continue;

            for (const rule of this.rules) {
                rule.check(findings, filePath, sqlAtoms, {
                    createFinding: this._finding.bind(this),
                    jsAtomsById,
                    jsAtomsByName
                });
            }
        }

        return this._summarize(findings);
    }

    _summarize(findings) {
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
