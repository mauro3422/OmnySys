import { RepositoryBypassRule } from './health/rules/repository-bypass-rule.js';
import { JoinCandidateRule } from './health/rules/join-candidate-rule.js';
import { SchemaDriftRule } from './health/rules/schema-drift-rule.js';
import { DynamicStorageRule } from './health/rules/dynamic-storage-rule.js';

// Rutas que SON el repositorio — acceso directo a DB aqui es correcto
const STORAGE_PATHS = [
    'src/layer-c-memory/storage/',
    'src/layer-c-memory/mcp/',
    'src/layer-c-memory/query/',
    'src/core/orchestrator/',
    'src/core/unified-server/',
    'src/core/cache/',
    'src/core/file-watcher/',
    'src/layer-a-static/pipeline/',
    'src/layer-a-static/indexer',
    'src/layer-c-memory/verification/',
    'src/layer-c-memory/shadow-registry/',
    'scripts/',
    'migrations/',
    'tests/',
    'check-sql',
    'test-health',
    'tmp-debug',
];

/**
 * Detector de salud arquitectural de OmnySys usando atoms SQL.
 */
export class OmnysysHealthDetector {
    constructor({ config = {} } = {}) {
        this.config = {
            multiSelectThreshold: config.multiSelectThreshold || 2,
            ...config
        };
        this._storageCache = new Map();
        this._initRules();
    }

    _initRules() {
        this.rules = [
            new RepositoryBypassRule(),
            new JoinCandidateRule(this.config),
            new SchemaDriftRule(),
            new DynamicStorageRule()
        ];
    }

    async detect(systemMap) {
        const findings = [];
        const files = systemMap?.files || {};

        for (const [filePath, fileData] of Object.entries(files)) {
            const allAtoms = fileData?.atoms || [];
            const sqlAtoms = allAtoms.filter(a => a.type === 'sql_query');
            if (sqlAtoms.length === 0) continue;

            const isStorageLayer = this._isStorage(filePath);

            for (const rule of this.rules) {
                rule.check(findings, filePath, sqlAtoms, {
                    isStorageLayer,
                    createFinding: this._finding.bind(this)
                });
            }
        }

        return this._summarize(findings);
    }

    _isStorage(filePath) {
        let isStorageLayer = this._storageCache.get(filePath);
        if (isStorageLayer === undefined) {
            isStorageLayer = STORAGE_PATHS.some(p => filePath.includes(p));
            this._storageCache.set(filePath, isStorageLayer);
        }
        return isStorageLayer;
    }

    _summarize(findings) {
        const highCount = findings.filter(f => f.severity === 'high').length;
        const medCount = findings.filter(f => f.severity === 'medium').length;
        const score = Math.max(0, 100 - highCount * 10 - medCount * 4);

        return {
            detector: 'omnysys-health',
            findings,
            score,
            summary: {
                repositoryBypass: findings.filter(f => f.type === 'sql-repo-bypass').length,
                joinCandidates: findings.filter(f => f.type === 'sql-join-candidate').length,
                schemaDrift: findings.filter(f => f.type === 'sql-schema-drift').length,
                dynamicInStorage: findings.filter(f => f.type === 'sql-dynamic-in-storage').length,
                totalFindings: findings.length
            }
        };
    }

    _finding(type, severity, filePath, atom, message, details = {}) {
        return {
            type, severity, filePath,
            atomId: atom.id, atomName: atom.name,
            line: atom.lineStart || atom.line || 0,
            message, details
        };
    }
}

export default OmnysysHealthDetector;
