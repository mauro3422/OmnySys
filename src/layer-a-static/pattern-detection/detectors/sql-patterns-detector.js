import {
    SelectStarRule, BulkMutationRule, MissingTransactionRule,
    N1RiskRule, DeadSqlQueryRule, QueryDensityRule
} from './rules/sql-pattern-rules.js';
import {
    buildSqlFinding,
    getJsAtomIndexes,
    getSqlAtomsByFile,
    scoreSqlFindings,
    summarizeSqlFindings
} from './sql-patterns-helpers.js';

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
        const { jsAtomsByName, jsAtomsById } = getJsAtomIndexes(files);

        for (const [filePath, sqlAtoms] of getSqlAtomsByFile(files)) {
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
        return {
            detector: 'sql-patterns',
            findings,
            score: scoreSqlFindings(findings),
            summary: summarizeSqlFindings(findings)
        };
    }

    _finding(type, severity, filePath, atom, message, details = {}) {
        return buildSqlFinding(type, severity, filePath, atom, message, details);
    }
}

export default SqlPatternsDetector;
