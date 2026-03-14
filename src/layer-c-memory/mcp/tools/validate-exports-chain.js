/**
 * @fileoverview validate-exports-chain.js
 *
 * Valida que los exports existen y la cadena de re-exports está completa.
 * Detecta errores como "module does not provide an export named X" antes del runtime.
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:ValidateExportsChain');

/**
 * Obtiene todos los exports de un archivo desde la DB
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Array>} Lista de nombres exportados
 */
export async function getFileExports(projectPath, filePath) {
  const repo = getRepository(projectPath);
  if (!repo?.db) {
    throw new Error('Database not available');
  }

  const normalizedFilePath = filePath.replace(/\\/g, '/');

  // Buscar exports en la tabla atoms
  const exports = repo.db.prepare(`
    SELECT name, is_exported
    FROM atoms
    WHERE file_path = ?
      AND is_exported = 1
      AND (is_removed IS NULL OR is_removed = 0)
  `).all(normalizedFilePath);

  return exports.map(e => e.name);
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

    // Verificar si este archivo exporta el nombre
    const exports = chain[chain.length - 1].exports;
    if (exports.includes(importName)) {
      // Encontrado! Verificar si es re-export
      const reExportSource = await findReExportSource(projectPath, currentFile, importName);
      if (reExportSource) {
        currentFile = reExportSource;
      } else {
        // Es el origen
        return {
          found: true,
          chain: chain,
          originFile: currentFile,
          exportName: importName
        };
      }
    } else {
      // No encontrado en este archivo
      return {
        found: false,
        chain: chain,
        error: `MISSING_EXPORT: ${importName} not exported from ${currentFile}`,
        lastFile: currentFile
      };
    }
  }

  // Ciclo detectado o camino agotado
  return {
    found: false,
    chain: chain,
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
  const repo = getRepository(projectPath);
  if (!repo?.db) {
    return null;
  }

  const normalizedFilePath = filePath.replace(/\\/g, '/');

  // Buscar en atom_relations de dónde viene este export
  const relation = repo.db.prepare(`
    SELECT source_path, target_path
    FROM atom_relations
    WHERE target_path = ?
      AND relation_type = 're_export'
      AND json_extract(metadata_json, '$.exportName') = ?
  `).get(normalizedFilePath, exportName);

  if (relation) {
    return relation.source_path;
  }

  // Fallback: buscar imports en el archivo
  const fs = await import('fs/promises');
  try {
    const content = await fs.readFile(projectPath + '/' + filePath, 'utf8');
    const exportMatch = content.match(/export\s*\{[^}]*\b(?:\w+\s+as\s+)?(\w+)\s+from\s*['"]([^'"]+)['"]/g);
    
    if (exportMatch) {
      for (const match of exportMatch) {
        const nameMatch = match.match(/(?:\w+\s+as\s+)?(\w+)/);
        if (nameMatch && nameMatch[1] === exportName) {
          const pathMatch = match.match(/from\s*['"]([^'"]+)['"]/);
          if (pathMatch) {
            return resolveModuleToPath(pathMatch[1], projectPath);
          }
        }
      }
    }
  } catch {
    // No se pudo leer el archivo
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

  // Resolver aliases
  if (modulePath.startsWith('#layer-c/')) {
    resolved = modulePath.replace('#layer-c/', 'src/layer-c-memory/');
  } else if (modulePath.startsWith('#')) {
    resolved = modulePath.replace('#', 'src/');
  }

  // Normalizar
  return resolved.replace(/\\/g, '/').replace(/^\//, '');
}

/**
 * Valida todos los imports de un archivo
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Archivo a validar
 * @returns {Promise<Object>} Resultado de validación
 */
export async function validateAllExports(projectPath, filePath) {
  const fs = await import('fs/promises');
  const content = await fs.readFile(projectPath + '/' + filePath, 'utf8');

  // Extraer imports
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop().trim());
    const fromModule = match[2];
    imports.push({ names, fromModule, line: content.slice(0, match.index).split('\n').length });
  }

  const results = [];
  for (const imp of imports) {
    for (const name of imp.names) {
      const chainResult = await traceExportChain(projectPath, filePath, name, imp.fromModule);
      results.push({
        importName: name,
        fromModule: imp.fromModule,
        line: imp.line,
        valid: chainResult.found,
        error: chainResult.error,
        chain: chainResult.chain
      });
    }
  }

  const invalid = results.filter(r => !r.valid);
  return {
    valid: invalid.length === 0,
    totalImports: results.length,
    invalidCount: invalid.length,
    invalid,
    results
  };
}
