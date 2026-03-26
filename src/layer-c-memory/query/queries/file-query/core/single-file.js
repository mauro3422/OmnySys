/**
 * @fileoverview Single file analysis queries
 * @module query/queries/file-query/core/single-file
 */

import path from 'path';
import { getRepository } from '#layer-c/storage/repository/index.js';
import {
  evaluateAtomRefactoringSignals,
  getSystemMapPersistenceCoverage,
  repairSystemMapPersistenceCoverage,
  summarizeAtomSemanticPurity,
  summarizeAtomTestability
} from '../../../../../shared/compiler/index.js';
import { getSystemFileSnapshot } from '../system-map.js';

/**
 * Normalizes file path to be relative to root
 * @param {string} rootPath - Project root
 * @param {string} filePath - File path (absolute or relative)
 * @returns {string} - Normalized relative path
 */
function normalizeFilePath(rootPath, filePath) {
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    return null;
  }

  let normalizedPath = filePath;
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');

  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }

  return normalizedPath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\//, '');
}

function parseJsonArray(value, fallback = []) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }

  return Array.isArray(value) ? value : fallback;
}

function getAtomType(atom) {
  return atom.atom_type || atom.type || 'unknown';
}

function getAtomName(atom) {
  return atom.name || 'unknown';
}

function getAtomCalls(atom) {
  return Array.isArray(atom.calls) ? atom.calls : parseJsonArray(atom.calls_json, []);
}

function getAtomCalledBy(atom) {
  return Array.isArray(atom.calledBy) ? atom.calledBy : parseJsonArray(atom.called_by_json, []);
}

function registerAtomExport(atom, atomExports, atomName, atomType) {
  if (atom.isExported) {
    atomExports.push({ name: atomName, kind: atomType });
  }
}

function mapAtom(atom, atomExports) {
  if (!atom) {
    return null;
  }

  const atomType = getAtomType(atom);
  const atomName = getAtomName(atom);

  registerAtomExport(atom, atomExports, atomName, atomType);

  return {
    id: atom.id,
    name: atomName,
    type: atomType,
    line: atom.lineStart || 0,
    endLine: atom.lineEnd || 0,
    linesOfCode: atom.linesOfCode || 0,
    complexity: atom.complexity || 0,
    isExported: !!atom.isExported,
    isAsync: !!atom.isAsync,
    calls: getAtomCalls(atom),
    calledBy: getAtomCalledBy(atom),
    archetype: atom.archetype_type || atom.archetype || 'unknown',
    purpose: atom.purpose_type || atom.purpose || 'unknown',
    compilerEvaluation: evaluateAtomRefactoringSignals(atom)
  };
}

function buildDefinitions(mappedAtoms) {
  return mappedAtoms.map(atom => ({
    name: atom.name,
    type: atom.type,
    line: atom.line
  }));
}

function buildSQLiteFileAnalysis(normalizedPath, row, atoms) {
  const dbExports = parseJsonArray(row.exports_json);
  const atomExports = [];
  const mappedAtoms = atoms.map(atom => mapAtom(atom, atomExports)).filter(Boolean);

  return {
    file: normalizedPath,
    path: normalizedPath,
    lastAnalyzed: row.last_analyzed || row.updated_at || new Date().toISOString(),
    atomCount: atoms.length,
    totalComplexity: row.total_complexity || 0,
    totalLines: row.total_lines || 0,
    moduleName: row.module_name || null,
    imports: parseJsonArray(row.imports_json),
    exports: atomExports.length > 0 ? atomExports : dbExports,
    atoms: mappedAtoms,
    compilerSignals: {
      testability: summarizeAtomTestability(mappedAtoms),
      semanticPurity: summarizeAtomSemanticPurity(mappedAtoms)
    },
    definitions: buildDefinitions(mappedAtoms),
    usedBy: [],
    importedBy: []
  };
}

/**
 * Gets complete analysis for a specific file.
 *
 * Priority: SQLite only.
 *
 * @param {string} rootPath - Project root
 * @param {string} filePath - Relative or absolute file path
 * @returns {Promise<object|null>} Complete file data
 */
export async function getFileAnalysis(rootPath, filePath) {
  const normalizedPath = normalizeFilePath(rootPath, filePath);

  if (!normalizedPath) {
    return null;
  }

  const repo = getRepository(rootPath);

  if (!repo || !repo.db) {
    throw new Error('SQLite not available. Run analysis first.');
  }

  try {
    const row = repo.getFile ? await repo.getFile(normalizedPath) : null;

    if (!row) {
      return null;
    }

    const atoms = repo.getByFile ? await repo.getByFile(normalizedPath) : [];
    const fileAnalysis = buildSQLiteFileAnalysis(normalizedPath, row, atoms);

    // Enrich from system_files for semantic data
    try {
      let systemMapCoverage = getSystemMapPersistenceCoverage(repo.db);
      if (systemMapCoverage.healthy === false) {
        repairSystemMapPersistenceCoverage(repo.db);
        systemMapCoverage = getSystemMapPersistenceCoverage(repo.db);
      }
      fileAnalysis.systemMapCoverage = systemMapCoverage;

      if (systemMapCoverage.healthy) {
        const sysRow = await getSystemFileSnapshot(rootPath, normalizedPath);
        if (sysRow) {
          fileAnalysis.semanticAnalysis = sysRow.semanticAnalysis || {};
          fileAnalysis.semanticConnections = sysRow.semanticConnections || [];
        } else {
          fileAnalysis.semanticAnalysis = {};
          fileAnalysis.semanticConnections = [];
        }
        fileAnalysis.systemMapTrustworthy = true;
      } else {
        fileAnalysis.semanticAnalysis = {};
        fileAnalysis.semanticConnections = [];
        fileAnalysis.systemMapTrustworthy = false;
      }
    } catch (e) {
      // Ignore system_files absence gracefully
    }

    return fileAnalysis;
  } catch (err) {
    throw new Error(`[getFileAnalysis] SQLite error: ${err.message}`);
  }
}
