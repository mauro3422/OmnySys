/**
 * Resolver - Resuelve rutas de imports a paths absolutos
 *
 * Responsabilidad:
 * - Resolver imports relativos (./utils → src/utils.js)
 * - Resolver aliases (tsconfig.json)
 * - Detectar imports de node_modules
 * - Manejar edge cases (sin extensión, index.js, etc.)
 *
 * @module layer-a-static/resolver
 */

import path from 'path';
import { readAliasConfig } from './resolver/resolver-aliases.js';
import { fileExists, findFileWithExtension, normalizeToProjectRelative, SUPPORTED_EXTENSIONS } from './resolver/resolver-fs.js';

/**
 * Resuelve un import a ruta relativa al proyecto
 */
export async function resolveImport(importSource, fromFile, projectRoot, aliases = {}) {
  // Detectar si es un módulo externo
  if (!importSource.startsWith('.') && !importSource.startsWith('/')) {
    const aliasMatch = Object.keys(aliases).find(alias => importSource.startsWith(alias));

    if (aliasMatch) {
      const relativePath = importSource.replace(aliasMatch, aliases[aliasMatch]);
      const resolved = path.join(projectRoot, relativePath);
      const actual = await findFileWithExtension(resolved);

      if (actual) {
        return {
          resolved: normalizeToProjectRelative(actual, projectRoot),
          type: 'local',
          reason: `Resolved via alias ${aliasMatch}`
        };
      }

      return {
        resolved: null,
        type: 'unresolved',
        reason: `Alias ${aliasMatch} resolved but file not found`
      };
    }

    return {
      resolved: null,
      type: 'external',
      reason: `External module: ${importSource}`
    };
  }

  // Import relativo o absoluto
  const fromFileAbsolute = path.isAbsolute(fromFile) ? fromFile : path.join(projectRoot, fromFile);
  const fromDir = path.dirname(fromFileAbsolute);
  let resolvedPath;

  if (importSource.startsWith('/')) {
    resolvedPath = path.join(projectRoot, importSource);
  } else {
    resolvedPath = path.resolve(fromDir, importSource);
  }

  resolvedPath = path.normalize(resolvedPath);

  const relToProject = path.relative(projectRoot, resolvedPath);
  if (relToProject.startsWith('..')) {
    return {
      resolved: null,
      type: 'external',
      reason: `Path escapes project: ${importSource}`
    };
  }

  const actual = await findFileWithExtension(resolvedPath);

  if (actual) {
    return {
      resolved: normalizeToProjectRelative(actual, projectRoot),
      type: 'local',
      reason: 'Resolved relative import'
    };
  }

  return {
    resolved: null,
    type: 'unresolved',
    reason: `File not found: ${resolvedPath}`
  };
}

/**
 * Resuelve múltiples imports
 */
export async function resolveImports(importSources, fromFile, projectRoot, aliases = {}) {
  const promises = importSources.map(source => resolveImport(source, fromFile, projectRoot, aliases));
  return Promise.all(promises);
}

/**
 * Obtiene configuración de resolución del proyecto
 */
export async function getResolutionConfig(projectRoot) {
  const aliases = await readAliasConfig(projectRoot);

  return {
    projectRoot,
    aliases,
    supportedExtensions: SUPPORTED_EXTENSIONS
  };
}

export default {
  resolveImport,
  resolveImports,
  getResolutionConfig
};
