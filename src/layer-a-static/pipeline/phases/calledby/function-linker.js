/**
 * @fileoverview function-linker.js
 *
 * Builds cross-file calledBy links by matching function calls
 * across all atoms using a multi-level lookup index and import resolution.
 *
 * @module pipeline/phases/calledby/function-linker
 */

import path from 'node:path';
import { resolveImport } from '../../../resolver.js';

// Cache para aliases del proyecto
let aliasCache = null;
let projectRootCache = null;

async function getAliases(projectRoot) {
  if (aliasCache && projectRootCache === projectRoot) {
    return aliasCache;
  }
  
  try {
    const { readAliasConfig } = await import('../../../resolver/resolver-aliases.js');
    aliasCache = await readAliasConfig(projectRoot);
    projectRootCache = projectRoot;
    return aliasCache;
  } catch (e) {
    return {};
  }
}

/**
 * Builds a multi-level atom lookup index from allAtoms.
 * @param {Object[]} allAtoms
 * @returns {{ bySimpleName: Map, byQualifiedName: Map, byId: Map }}
 */
export function buildAtomIndex(allAtoms) {
  const bySimpleName = new Map();
  const byQualifiedName = new Map();
  const byId = new Map();

  for (const atom of allAtoms) {
    if (!bySimpleName.has(atom.name)) bySimpleName.set(atom.name, []);
    bySimpleName.get(atom.name).push(atom);

    if (atom.className) {
      byQualifiedName.set(`${atom.className}.${atom.name}`, atom);
    }

    byId.set(atom.id, atom);
  }

  return { bySimpleName, byQualifiedName, byId };
}

/**
 * Finds the best matching target atom for a call, using imports for precision.
 * Now with support for path aliases (#layer-c, #utils, etc.)
 * @param {string} callName
 * @param {Object} callerAtom
 * @param {{ bySimpleName: Map, byQualifiedName: Map }} index
 * @param {Array} fileImports - Imports of the caller's file
 * @param {string} projectRoot - Project root path for alias resolution
 * @returns {Promise<Object|null>}
 */
export async function findTargetAtom(callName, callerAtom, index, fileImports = [], projectRoot = null) {
  if (callName && callName.includes('.')) {
    return index.byQualifiedName.get(callName) || null;
  }

  // 1. Resolve via Imports
  const importSpec = (fileImports || [])
    .flatMap(i => i.specifiers || [])
    .find(s => s.local === callName || s.name === callName);

  if (importSpec) {
    const parentImport = fileImports.find(i => (i.specifiers || []).includes(importSpec));
    if (parentImport && parentImport.source) {
      const candidates = index.bySimpleName.get(importSpec.imported || importSpec.name) || [];
      
      // Try to resolve the import path (handles both relative and aliases)
      let resolvedImportPath = null;
      
      if (parentImport.source.startsWith('.')) {
        // Relative import
        const callerDir = path.dirname(callerAtom.filePath);
        resolvedImportPath = path.resolve(callerDir, parentImport.source).replace(/\\/g, '/');
      } else if (projectRoot) {
        // Try to resolve as alias
        const aliases = await getAliases(projectRoot);
        const resolution = await resolveImport(parentImport.source, callerAtom.filePath, projectRoot, aliases);
        if (resolution.resolved) {
          resolvedImportPath = resolution.resolved.replace(/\\/g, '/');
        }
      }
      
      if (resolvedImportPath) {
        const exactMatch = candidates.find(a => {
          try {
            const atomPath = a.filePath.replace(/\\/g, '/');
            return atomPath === resolvedImportPath ||
              atomPath === resolvedImportPath + '.js' ||
              atomPath === resolvedImportPath + '.mjs' ||
              atomPath.replace(/\.[jt]sx?$/, '') === resolvedImportPath.replace(/\.[jt]sx?$/, '');
          } catch (e) {
            return false;
          }
        });
        if (exactMatch) return exactMatch;
      }
      
      // Fallback: try without resolution (for cases where alias config is missing)
      const fallbackMatch = candidates.find(a => {
        const atomPath = a.filePath.replace(/\\/g, '/');
        const importPath = parentImport.source.replace(/\\/g, '/');
        return atomPath.includes(importPath) || importPath.includes(atomPath.replace(/\.js$/, ''));
      });
      if (fallbackMatch) return fallbackMatch;
    }
  }

  // 2. Fallback Heurístico
  const candidates = index.bySimpleName.get(callName) || [];
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const local = candidates.find(a => a.filePath === callerAtom.filePath);
  if (local) return local;

  const exported = candidates.find(a => a.isExported);
  if (exported) return exported;

  const differentFile = candidates.find(a => a.filePath !== callerAtom.filePath);
  return differentFile || candidates[0];
}

/**
 * Links calledBy for function/method calls across all atoms.
 * Mutates atoms in place.
 *
 * @param {Object[]} allAtoms
 * @param {Object} parsedFiles - Full parsed files map to access imports
 * @param {string} absoluteRootPath
 * @param {Object} index - from buildAtomIndex()
 * @param {boolean} verbose
 * @returns {Promise<{ crossFileLinks: number, intraFileLinks: number, updatedAtoms: Array }>}
 */
export async function linkFunctionCalledBy(allAtoms, parsedFiles, absoluteRootPath, index, verbose) {
  let crossFileLinks = 0;
  let intraFileLinks = 0;

  for (const callerAtom of allAtoms) {
    const fileInfo = parsedFiles[callerAtom.filePath] || {};
    const fileImports = fileInfo.imports || [];

    const allCalls = [
      ...(callerAtom.calls || []),
      ...(callerAtom.internalCalls || []),
      ...(callerAtom.externalCalls || [])
    ];

    for (const call of allCalls) {
      if (!call.name) continue;

      const targetAtom = await findTargetAtom(call.name, callerAtom, index, fileImports, absoluteRootPath);
      if (!targetAtom || targetAtom.id === callerAtom.id) continue;

      if (!targetAtom.calledBy) targetAtom.calledBy = [];
      if (!targetAtom.calledBy.includes(callerAtom.id)) {
        targetAtom.calledBy.push(callerAtom.id);
        if (targetAtom.filePath !== callerAtom.filePath) crossFileLinks++;
        else intraFileLinks++;
      }
    }
  }

  // Recompute changeRisk for updated atoms
  const updatedAtoms = allAtoms.filter(a => a.calledBy && a.calledBy.length > 0);
  for (const atom of updatedAtoms) {
    if (!atom.filePath || !atom.name) continue;
    if (atom.derived) {
      const calledByCount = atom.calledBy.length;
      const complexity = atom.complexity || 1;
      const exportRisk = atom.isExported ? 0.2 : 0;
      atom.derived.changeRisk = Math.round(
        Math.min(1, (calledByCount / 20) * 0.5 + (complexity / 100) * 0.3 + exportRisk) * 100
      ) / 100;
    }
  }

  if (verbose) {
    const { createLogger } = await import('#utils/logger.js');
    const logger = createLogger('OmnySys:indexer');
    logger.info(`  ✓ ${crossFileLinks} cross-file + ${intraFileLinks} intra-file calledBy links (${updatedAtoms.length} atoms updated)`);
  }

  return { crossFileLinks, intraFileLinks, updatedAtoms };
}
