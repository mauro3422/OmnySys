/**
 * @fileoverview validate-exports-chain.js
 *
 * Valida que los exports existen y la cadena de re-exports está completa.
 * Detecta errores como "module does not provide an export named X" antes del runtime.
 */

import { builtinModules } from 'node:module';
import path from 'node:path';
import { getFileAnalysis, getFileExports as getCanonicalFileExports } from '#layer-c/query/apis/file-api.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:ValidateExportsChain');

function normalizeCompilerPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function isBuiltinModuleSpecifier(modulePath = '') {
  const normalized = String(modulePath || '').replace(/^node:/, '');
  return builtinModules.includes(normalized);
}

function isExternalNonCanonicalModule(modulePath = '') {
  const normalized = String(modulePath || '');
  return !normalized.startsWith('.') &&
    !normalized.startsWith('#') &&
    !isBuiltinModuleSpecifier(normalized);
}

function getSpecifierNames(specifier = {}) {
  const remoteName = String(specifier?.imported || specifier?.name || specifier?.local || '').trim();
  const localName = String(specifier?.local || specifier?.name || remoteName || '').trim();
  return { remoteName, localName };
}

function buildMissingDatabaseResult(filePath) {
  return {
    valid: false,
    totalImports: 0,
    invalidCount: 1,
    invalid: [{
      importName: '*',
      fromModule: filePath,
      line: 0,
      valid: false,
      error: 'DB_MISSING: file is not indexed in the canonical compiler DB',
      chain: []
    }],
    results: [],
    validationMode: 'database_only',
    compilerIndexed: false
  };
}

function buildSkippedImportResult(imp, fromModule) {
  if (!fromModule) return null;

  if (!isBuiltinModuleSpecifier(fromModule) && !isExternalNonCanonicalModule(fromModule)) {
    return null;
  }

  const builtin = isBuiltinModuleSpecifier(fromModule);

  return {
    importName: fromModule,
    exportName: fromModule,
    fromModule,
    line: imp.line || imp.loc?.start?.line || 0,
    valid: true,
    skipped: true,
    reason: builtin ? 'builtin_module' : 'external_module',
    chain: []
  };
}

function getImportTargets(imp = {}) {
  const specifiers = Array.isArray(imp?.specifiers) && imp.specifiers.length > 0
    ? imp.specifiers
    : [];

  if (specifiers.length > 0) {
    return specifiers
      .map(getSpecifierNames)
      .filter(({ remoteName }) => remoteName);
  }

  if (Array.isArray(imp?.names)) {
    return imp.names
      .map((name) => String(name || '').trim())
      .filter(Boolean)
      .map((name) => ({ remoteName: name, localName: name }));
  }

  return [];
}

async function buildValidationResultsForImport(projectPath, filePath, imp) {
  const fromModule = imp?.resolvedPath || imp?.resolved || imp?.source || imp?.fromModule;
  const skippedResult = buildSkippedImportResult(imp, fromModule);

  if (skippedResult) {
    return [skippedResult];
  }

  const results = [];
  const targets = getImportTargets(imp);

  for (const { remoteName, localName } of targets) {
    const chainResult = await traceExportChain(projectPath, filePath, remoteName, fromModule);
    results.push({
      importName: localName,
      exportName: remoteName,
      fromModule,
      line: imp.line || imp.loc?.start?.line || 0,
      valid: chainResult.found,
      error: chainResult.error,
      chain: chainResult.chain
    });
  }

  return results;
}

/**
 * Obtiene todos los exports de un archivo desde la DB
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Array>} Lista de nombres exportados
 */
export async function getFileExports(projectPath, filePath) {
  try {
    const normalizedFilePath = normalizeCompilerPath(filePath);
    const exports = await getCanonicalFileExports(projectPath, normalizedFilePath);
    return Array.from(exports || []);
  } catch (error) {
    logger.warn(`[validate-exports] getFileExports failed for ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Traza la cadena de un export desde el archivo final hasta el origen
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} targetFile - Archivo que importa (ej: context-resolver.js)
 * @param {string} importName - Nombre importado (ej: findAtomByLine)
 * @param {string} fromModule - Módulo del import (ej: #layer-c/query/apis/file-api.js)
 * @returns {Promise<Object>} Resultado de la trazabilidad
 */
export async function traceExportChain(projectPath, targetFile, importName, fromModule) {
  const chain = [];
  const visited = new Set();
  let currentFile = resolveModuleToPath(fromModule, projectPath, targetFile);

  while (currentFile && !visited.has(currentFile)) {
    visited.add(currentFile);
    chain.push({
      file: currentFile,
      exports: await getFileExports(projectPath, currentFile)
    });

    const exports = chain[chain.length - 1].exports;
    if (exports.includes(importName)) {
      const reExportSource = await findReExportSource(projectPath, currentFile, importName);
      if (reExportSource) {
        currentFile = reExportSource;
      } else {
        return {
          found: true,
          chain,
          originFile: currentFile,
          exportName: importName
        };
      }
    } else {
      return {
        found: false,
        chain,
        error: `MISSING_EXPORT: ${importName} not exported from ${currentFile}`,
        lastFile: currentFile
      };
    }
  }

  return {
    found: false,
    chain,
    error: 'EXPORT_CHAIN_BROKEN: Circular dependency or dead end',
    circular: visited.has(currentFile)
  };
}

/**
 * Encuentra el origen de un re-export
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Archivo actual
 * @param {string} exportName - Nombre del export
 * @returns {Promise<string|null>} Ruta del archivo origen o null
 */
async function findReExportSource(projectPath, filePath, exportName) {
  return await findReExportSourceFromAnalysis(projectPath, normalizeCompilerPath(filePath), exportName);
}

function getReExportSourcePath(entry, exportName, projectPath, filePath) {
  const sourcePath = entry?.resolvedPath || entry?.resolved || entry?.source;
  if (!sourcePath) return null;

  const specifiers = Array.isArray(entry?.specifiers) ? entry.specifiers : [];
  const matchesExport = specifiers.some((specifier) => (
    specifier?.name === exportName ||
    specifier?.local === exportName ||
    specifier?.imported === exportName
  )) || entry?.exportName === exportName || entry?.name === exportName;

  if (!matchesExport) return null;

  if (isReExportEntry(entry) || specifiers.length > 0) {
    return resolveModuleToPath(sourcePath, projectPath, filePath);
  }

  return null;
}

function isReExportEntry(entry) {
  return entry?.type === 'reexport' ||
    entry?.kind === 'reexport' ||
    entry?.isReExport === true ||
    entry?.is_reexport === true ||
    entry?.exportKind === 'reexport';
}

async function findReExportSourceFromAnalysis(projectPath, filePath, exportName) {
  const analysis = await getFileAnalysis(projectPath, filePath).catch(() => null);
  const imports = Array.isArray(analysis?.imports) ? analysis.imports : [];

  for (const entry of imports) {
    const source = getReExportSourcePath(entry, exportName, projectPath, filePath);
    if (source) {
      return source;
    }
  }

  return null;
}

/**
 * Resuelve un módulo a ruta de archivo
 * @param {string} modulePath - Ruta del módulo (puede ser alias)
 * @param {string} projectPath - Ruta del proyecto
 * @returns {string} Ruta normalizada
 */
function resolveModuleToPath(modulePath, projectPath, baseFilePath = '') {
  let resolved = String(modulePath || '').trim();

  if (!resolved) return resolved;

  if (resolved.startsWith('#layer-c/')) {
    resolved = resolved.replace('#layer-c/', 'src/layer-c-memory/');
  } else if (resolved.startsWith('#')) {
    resolved = resolved.replace('#', 'src/');
  } else if (resolved.startsWith('.')) {
    const normalizedBase = normalizeCompilerPath(baseFilePath);
    const baseDir = normalizedBase ? path.posix.dirname(normalizedBase) : '';
    resolved = baseDir
      ? path.posix.normalize(path.posix.join(baseDir, resolved))
      : path.posix.normalize(resolved);
  }

  return resolved.replace(/\\/g, '/').replace(/^\//, '');
}

/**
 * Valida los imports de un archivo contra la DB canónica
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Archivo a validar
 * @returns {Promise<Object>} Resultado de validación
 */
export async function validateAllExports(projectPath, filePath) {
  const normalizedFilePath = normalizeCompilerPath(filePath);
  const analysis = await getFileAnalysis(projectPath, normalizedFilePath).catch(() => null);

  if (!analysis) {
    return buildMissingDatabaseResult(filePath);
  }

  const imports = Array.isArray(analysis.imports) ? analysis.imports : [];
  const results = [];

  for (const imp of imports) {
    const importResults = await buildValidationResultsForImport(projectPath, filePath, imp);
    results.push(...importResults);
  }

  const invalid = results.filter((result) => !result.valid);
  return {
    valid: invalid.length === 0,
    totalImports: results.length,
    invalidCount: invalid.length,
    invalid,
    results,
    validationMode: 'database_only',
    compilerIndexed: true
  };
}
