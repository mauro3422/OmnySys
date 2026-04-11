import { RepositoryBypassRule } from './health/rules/repository-bypass-rule.js';
import { JoinCandidateRule } from './health/rules/join-candidate-rule.js';
import { SchemaDriftRule } from './health/rules/schema-drift-rule.js';
import { DynamicStorageRule } from './health/rules/dynamic-storage-rule.js';
import {
  STORAGE_PATHS,
  getSqlAtomsByFile,
  isStoragePath,
  summarizeOmnysysHealthFindings
} from './omnysys-health-helpers.js';

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

    for (const [filePath, sqlAtoms] of getSqlAtomsByFile(files)) {
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
      isStorageLayer = isStoragePath(filePath, STORAGE_PATHS);
      this._storageCache.set(filePath, isStorageLayer);
    }
    return isStorageLayer;
  }

  _summarize(findings) {
    const summary = summarizeOmnysysHealthFindings(findings);

    return {
      detector: 'omnysys-health',
      findings,
      score: summary.score,
      summary: {
        repositoryBypass: summary.repositoryBypass,
        joinCandidates: summary.joinCandidates,
        schemaDrift: summary.schemaDrift,
        dynamicInStorage: summary.dynamicInStorage,
        totalFindings: summary.totalFindings
      }
    };
  }

  _finding(type, severity, filePath, atom, message, details = {}) {
    return {
      type,
      severity,
      filePath,
      atomId: atom.id,
      atomName: atom.name,
      line: atom.lineStart || atom.line || 0,
      message,
      details
    };
  }
}

export default OmnysysHealthDetector;
