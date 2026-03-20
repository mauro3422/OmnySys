/**
 * @fileoverview validate-exports-chain.js
 *
 * Valida que los exports existen y la cadena de re-exports está completa.
 * Detecta errores como "module does not provide an export named X" antes del runtime.
 */

import { getFileAnalysis, getFileExports as getCanonicalFileExports } from '#layer-c/query/apis/file-api.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:ValidateExportsChain');

function normalizeCompilerPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
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
  let currentFile = resolveModuleToPath(fromModule, projectPath);

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

function getReExportSourcePath(entry, exportName, projectPath) {
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
    return resolveModuleToPath(sourcePath, projectPath);
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
    const source = getReExportSourcePath(entry, exportName, projectPath);
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
function resolveModuleToPath(modulePath, projectPath) {
  let resolved = modulePath;

  if (modulePath.startsWith('#layer-c/')) {
    resolved = modulePath.replace('#layer-c/', 'src/layer-c-memory/');
  } else if (modulePath.startsWith('#')) {
    resolved = modulePath.replace('#', 'src/');
  }

  return resolved.replace(/\\/g, '/').replace(/^\//, '');
}

/**
 * Valida todos los imports de un archivo
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Archivo a validar
 * @returns {Promise<Object>} Resultado de validación
 */
export async function validateAllExports(projectPath, filePath) {
  const normalizedFilePath = normalizeCompilerPath(filePath);
  const analysis = await getFileAnalysis(projectPath, normalizedFilePath).catch(() => null);

  if (!analysis) {
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

  const imports = Array.isArray(analysis.imports) ? analysis.imports : [];
  const results = [];

  for (const imp of imports) {
    const names = Array.isArray(imp?.specifiers) && imp.specifiers.length > 0
      ? imp.specifiers.map((specifier) => specifier?.local || specifier?.name || specifier?.imported).filter(Boolean)
      : Array.isArray(imp?.names)
        ? imp.names
        : [];
    const fromModule = imp?.resolvedPath || imp?.resolved || imp?.source || imp?.fromModule;

    for (const name of names) {
      const chainResult = await traceExportChain(projectPath, filePath, name, fromModule);
      results.push({
        importName: name,
        fromModule,
        line: imp.line || imp.loc?.start?.line || 0,
        valid: chainResult.found,
        error: chainResult.error,
        chain: chainResult.chain
      });
    }
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
