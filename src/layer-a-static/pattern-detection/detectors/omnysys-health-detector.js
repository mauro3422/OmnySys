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
        const createFinding = this._finding.bind(this);

        for (const [filePath, fileData] of Object.entries(files)) {
            const allAtoms = fileData?.atoms || [];
            const sqlAtoms = allAtoms.filter(a => a.type === 'sql_query');
            if (sqlAtoms.length === 0) continue;

            const isStorageLayer = this._isStorage(filePath);

            for (const rule of this.rules) {
                rule.check(findings, filePath, sqlAtoms, {
                    isStorageLayer,
                    createFinding
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
        let highCount = 0;
        let medCount = 0;
        let repositoryBypass = 0;
        let joinCandidates = 0;
        let schemaDrift = 0;
        let dynamicInStorage = 0;

        for (const finding of findings) {
            if (finding.severity === 'high') highCount++;
            if (finding.severity === 'medium') medCount++;

            if (finding.type === 'sql-repo-bypass') repositoryBypass++;
            if (finding.type === 'sql-join-candidate') joinCandidates++;
            if (finding.type === 'sql-schema-drift') schemaDrift++;
            if (finding.type === 'sql-dynamic-in-storage') dynamicInStorage++;
        }

        const score = Math.max(0, 100 - highCount * 10 - medCount * 4);

        return {
            detector: 'omnysys-health',
            findings,
            score,
            summary: {
                repositoryBypass,
                joinCandidates,
                schemaDrift,
                dynamicInStorage,
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
