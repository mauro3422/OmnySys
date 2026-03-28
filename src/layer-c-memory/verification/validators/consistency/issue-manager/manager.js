import { DataSystem, IssueCategory, Severity } from '../../../types/index.js';

const DEFAULT_SUMMARY = () => ({
  data: {
    atoms: 0,
    files: 0,
    connections: 0
  },
  issues: {
    total: 0,
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    },
    byCategory: {},
    bySystem: {}
  }
});

function normalizeKey(value) {
  return String(value || '').toLowerCase();
}

export class IssueManager {
  constructor() {
    this.issues = [];
  }

  resetIssues() {
    this.issues = [];
    return this;
  }

  clear() {
    return this.resetIssues();
  }

  addIssue(issue) {
    this.issues.push({
      id: `consistency-${Date.now()}-${this.issues.length}`,
      timestamp: new Date().toISOString(),
      ...issue
    });
    return this;
  }

  addNonExistentFileIssue(atomId, filePath, isHistorical) {
    return this.addIssue({
      category: IssueCategory.COMPLETENESS,
      severity: isHistorical ? Severity.LOW : Severity.HIGH,
      system: DataSystem.ATOMS,
      path: filePath,
      message: `Atom ${atomId} references missing file`,
      suggestion: isHistorical
        ? 'Remove the historical/test atom entry or restore the file'
        : 'Create the missing file or update the atom path'
    });
  }

  addFunctionNotFoundIssue(atomId, atomName, definitions = []) {
    return this.addIssue({
      category: IssueCategory.COHERENCE,
      severity: Severity.MEDIUM,
      system: DataSystem.FILES,
      path: atomId,
      message: `Function ${atomName} not found in file definitions`,
      expected: definitions.map(def => def.name).join(', '),
      actual: atomName,
      suggestion: 'Synchronize atom metadata with the file definitions'
    });
  }

  addExportMismatchIssue(atomId, atomIsExported, isExportedInFile) {
    return this.addIssue({
      category: IssueCategory.CONSISTENCY,
      severity: Severity.MEDIUM,
      system: DataSystem.ATOMS,
      path: atomId,
      message: 'Atom export state does not match file export state',
      expected: String(isExportedInFile),
      actual: String(atomIsExported),
      suggestion: 'Align atom export metadata with the file exports'
    });
  }

  addMissingAtomsIssue(filePath, functionCount, classification) {
    return this.addIssue({
      category: IssueCategory.COMPLETENESS,
      severity: Severity.HIGH,
      system: DataSystem.FILES,
      path: filePath,
      message: 'File contains functions but no matching atoms',
      expected: `${functionCount} atoms`,
      actual: '0 atoms',
      suggestion: `Generate atoms for ${classification || 'the file'}`
    });
  }

  addConnectionNonExistentFileIssue(connectionId, filePath, type, isHistorical) {
    return this.addIssue({
      category: IssueCategory.COHERENCE,
      severity: isHistorical ? Severity.LOW : Severity.HIGH,
      system: DataSystem.CONNECTIONS,
      path: filePath,
      message: `Connection ${connectionId} references missing ${type} file`,
      suggestion: isHistorical
        ? 'Remove the historical/test connection entry'
        : 'Create the referenced file or update the connection metadata'
    });
  }

  getIssues() {
    return this.issues;
  }

  hasCriticalIssues() {
    return this.issues.some(issue => normalizeKey(issue.severity) === Severity.CRITICAL);
  }

  calculateStats() {
    const stats = {
      total: this.issues.length,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      },
      byCategory: {},
      bySystem: {}
    };

    for (const issue of this.issues) {
      const severity = normalizeKey(issue.severity) || 'info';
      const category = normalizeKey(issue.category) || 'unknown';
      const system = normalizeKey(issue.system) || 'unknown';

      if (stats.bySeverity[severity] !== undefined) {
        stats.bySeverity[severity]++;
      } else {
        stats.bySeverity.info++;
      }

      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.bySystem[system] = (stats.bySystem[system] || 0) + 1;
    }

    return stats;
  }

  generateSummary(cache = null) {
    const summary = DEFAULT_SUMMARY();
    summary.data.atoms = cache?.atoms?.size ?? 0;
    summary.data.files = cache?.files?.size ?? 0;
    summary.data.connections = cache?.connections?.length ?? 0;
    summary.issues = this.calculateStats();
    return summary;
  }
}

export default IssueManager;
