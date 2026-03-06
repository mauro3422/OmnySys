/**
 * @fileoverview Single file analysis queries
 * @module query/queries/file-query/core/single-file
 */

import path from 'path';
import { getDataDirectory } from '#layer-c/storage/index.js';
import { readJSON } from '#layer-c/query/readers/json-reader.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import {
  evaluateAtomRefactoringSignals,
  summarizeAtomSemanticPurity,
  summarizeAtomTestability
} from '../../../../../shared/compiler/index.js';

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
    return JSON.parse(value);
  }

  return Array.isArray(value) ? value : fallback;
}

function mapAtom(atom, atomExports) {
  if (!atom) {
    return null;
  }

  const atomType = atom.atom_type || atom.type || 'unknown';
  const atomName = atom.name || 'unknown';

  if (atom.isExported) {
    atomExports.push({ name: atomName, kind: atomType });
  }

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
    calls: parseJsonArray(atom.calls_json, Array.isArray(atom.calls) ? atom.calls : []),
    calledBy: parseJsonArray(atom.called_by_json, Array.isArray(atom.calledBy) ? atom.calledBy : []),
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
 * Priority: SQLite first, then JSON fallback for backwards compatibility.
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

  try {
    const repo = getRepository(rootPath);

    if (repo) {
      const row = repo.getFile ? await repo.getFile(normalizedPath) : null;

      if (row) {
        const atoms = repo.getByFile ? await repo.getByFile(normalizedPath) : [];
        return buildSQLiteFileAnalysis(normalizedPath, row, atoms);
      }
    }
  } catch (err) {
    console.error(`[getFileAnalysis] SQLite error, falling back to JSON: ${err.message}`);
  }

  const dataPath = getDataDirectory(rootPath).replace(/\\/g, '/');
  const filePart = path.posix.join(dataPath, 'files', normalizedPath.replace(/\\/g, '/') + '.json');
  return readJSON(filePart);
}
