import fs from 'fs/promises';
import path from 'path';
import { getFileAnalysis } from '#layer-c/query/apis/file-api.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { buildPolicyDriftPropagationPlan, normalizeComparablePath, normalizePath } from '#shared/compiler/index.js';
import { loadModuleExportsFromDb } from './module-export-loader.js';

function resolveImportModulePath(projectPath, importingFilePath, modulePath) {
  if (!modulePath) return '';
  const normalized = normalizePath(modulePath, projectPath);
  if (!modulePath.startsWith('.') && !modulePath.startsWith('/')) return normalized;
  const importingDir = path.posix.dirname(importingFilePath);
  const resolved = path.posix.join(importingDir, modulePath);
  const withExtension = resolved.endsWith('.js') ? resolved : `${resolved}.js`;
  return normalizePath(withExtension, projectPath);
}

function resolveImportModuleFsPath(projectPath, importingFilePath, modulePath) {
  const normalizedModulePath = resolveImportModulePath(projectPath, importingFilePath, modulePath);
  if (!normalizedModulePath) return '';
  return path.isAbsolute(normalizedModulePath)
    ? normalizedModulePath
    : path.resolve(projectPath, normalizedModulePath);
}

function parseJsonArray(value, fallback = []) {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return Array.isArray(value) ? value : fallback;
}

async function loadIndexedFileAnalysis(projectPath, filePath, repo = null) {
  const indexedFilePath = normalizePath(filePath, projectPath);
  const indexedRepo = repo || getRepository(projectPath);
  if (indexedRepo?.initialized && indexedRepo?.db && indexedRepo.db.open !== false) {
    const row = indexedRepo.db.prepare('SELECT * FROM files WHERE path = ? AND is_removed = 0').get(indexedFilePath);
    if (row) {
      const atoms = indexedRepo.db.prepare('SELECT * FROM atoms WHERE file_path = ? AND is_removed = 0').all(indexedFilePath);
      return {
        file: indexedFilePath,
        path: indexedFilePath,
        imports: parseJsonArray(row.imports_json, []),
        exports: parseJsonArray(row.exports_json, []),
        atoms,
        atomCount: atoms.length,
        propagation: buildPolicyDriftPropagationPlan({
          filePath: indexedFilePath,
          importCount: parseJsonArray(row.imports_json, []).length,
          brokenCount: 0
        })
      };
    }
  }
  const analysis = await getFileAnalysis(projectPath, indexedFilePath).catch(() => null);
  return analysis || null;
}

async function inspectImportEntryAgainstDb(projectPath, importingFilePath, entry, exportsByModule, options = {}) {
  const rawModulePath = entry?.resolvedPath || entry?.resolved || entry?.source || entry?.fromModule;
  const specifiers = Array.isArray(entry?.specifiers) ? entry.specifiers : [];
  const names = specifiers.map((specifier) => specifier?.local || specifier?.name || specifier?.imported).filter(Boolean);
  const namespaceImport = specifiers.some((specifier) => specifier?.type === 'namespace');
  if (!rawModulePath || namespaceImport || names.length === 0) return [];

  const resolvedModulePath = resolveImportModulePath(projectPath, importingFilePath, rawModulePath);
  if (options?.checkFileExistence) {
    try {
      await fs.access(resolveImportModuleFsPath(projectPath, importingFilePath, rawModulePath));
    } catch {
      return [{
        source: rawModulePath,
        type: 'fs',
        resolved: false,
        reason: 'missing_module',
        missingModule: resolvedModulePath
      }];
    }
  }

  const moduleExports = await loadModuleExportsFromDb(projectPath, resolvedModulePath, exportsByModule);
  return names.filter((name) => !moduleExports.has(name)).map((missingName) => ({ source: rawModulePath, type: 'db', resolved: true, reason: 'missing_named_export', missingExport: missingName }));
}

export async function collectDatabaseImportState(projectPath, filePath, repo = null, options = {}) {
  const indexedFilePath = normalizePath(filePath, projectPath);
  const analysis = await loadIndexedFileAnalysis(projectPath, indexedFilePath, repo);
  if (!analysis) throw new Error(`DB_MISSING: ${filePath} is not indexed in the canonical compiler DB`);

  const imports = Array.isArray(analysis.imports) ? analysis.imports : [];
  const exportsByModule = new Map();
  const broken = [];
  const fingerprints = new Set();
  const pushUnique = (entry) => {
    const fingerprint = [entry?.source || '', entry?.reason || '', entry?.missingExport || ''].join('::');
    if (fingerprints.has(fingerprint)) return;
    fingerprints.add(fingerprint);
    broken.push(entry);
  };

  for (const entry of imports) {
    const brokenEntries = await inspectImportEntryAgainstDb(projectPath, indexedFilePath, entry, exportsByModule, options);
    for (const brokenEntry of brokenEntries) pushUnique(brokenEntry);
  }

  return {
    source: analysis,
    broken,
    specifierCount: imports.length,
    compilerIndexed: true,
    sourceOfTruth: 'database',
    propagation: buildPolicyDriftPropagationPlan({
      filePath: indexedFilePath,
      importCount: imports.length,
      brokenCount: broken.length
    })
  };
}

export async function buildDatabaseOnlyValidation(projectPath, filePath, repo = null, options = {}) {
  try {
    const state = await collectDatabaseImportState(projectPath, filePath, repo, options);
    return {
      file: filePath,
      totalImports: state.specifierCount,
      brokenPaths: state.broken.map((entry) => entry.source),
      brokenImports: state.broken,
      unusedImports: [],
      circularDependencies: [],
      status: state.broken.length === 0 ? 'CLEAN' : 'HAS_ISSUES',
      validationMode: 'database_only',
      compilerIndexed: state.compilerIndexed,
      propagation: state.propagation
    };
  } catch (error) {
    return {
      file: filePath,
      totalImports: 0,
      brokenPaths: [],
      brokenImports: [{
        source: '*',
        type: 'db_error',
        resolved: false,
        reason: 'db_unavailable',
        missingExport: error.message
      }],
      unusedImports: [],
      circularDependencies: [],
      status: 'HAS_ISSUES',
      validationMode: 'database_only',
      compilerIndexed: false,
      propagation: buildPolicyDriftPropagationPlan({ filePath, importCount: 0, brokenCount: 1 })
    };
  }
}

export async function collectBrokenImports(fileData, projectPath, filePath, checkBroken, repo = null, options = {}) {
  if (!checkBroken) return [];
  const state = await collectDatabaseImportState(projectPath, filePath, repo, options);
  return state?.broken || [];
}

export async function buildIndexedValidationResult(repo, filePath, fileData, broken, unused, circularPaths, projectPath) {
  const indexedImportCount = Array.isArray(fileData?.imports) ? fileData.imports.length : 0;
  const propagation = buildPolicyDriftPropagationPlan({
    filePath,
    importCount: indexedImportCount,
    brokenCount: broken.length,
    circularCount: circularPaths.length
  });
  return {
    file: filePath,
    totalImports: indexedImportCount,
    brokenPaths: broken.map((entry) => entry.source),
    brokenImports: broken,
    unusedImports: unused.map((entry) => entry.name),
    circularDependencies: circularPaths,
    status: broken.length === 0 && unused.length === 0 && circularPaths.length === 0 ? 'CLEAN' : 'HAS_ISSUES',
    validationMode: 'database_only',
    compilerIndexed: true,
    propagation
  };
}

export const collectFilesystemImportState = collectDatabaseImportState;
export const buildFilesystemOnlyValidation = buildDatabaseOnlyValidation;
export { loadIndexedFileAnalysis };
export { normalizeComparablePath };
