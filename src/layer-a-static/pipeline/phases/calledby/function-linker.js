/**
 * @fileoverview function-linker.js
 *
 * Builds cross-file calledBy links by matching function calls
 * across all atoms using a multi-level lookup index and import resolution.
 *
 * @module pipeline/phases/calledby/function-linker
 */

import path from 'node:path';

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
 * @param {string} callName
 * @param {Object} callerAtom
 * @param {{ bySimpleName: Map, byQualifiedName: Map }} index
 * @param {Array} fileImports - Imports of the caller's file
 * @returns {Object|null}
 */
export function findTargetAtom(callName, callerAtom, index, fileImports = []) {
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
      const exactMatch = candidates.find(a => {
        try {
          // Resolve relative path using caller's directory
          const callerDir = path.dirname(callerAtom.filePath);
          const resolvedImport = path.resolve(callerDir, parentImport.source).replace(/\\/g, '/');
          const atomPath = a.filePath.replace(/\\/g, '/');

          return atomPath === resolvedImport ||
            atomPath === resolvedImport + '.js' ||
            atomPath === resolvedImport + '.mjs' ||
            atomPath.replace(/\.[jt]sx?$/, '') === resolvedImport.replace(/\.[jt]sx?$/, '');
        } catch (e) {
          return false;
        }
      });
      if (exactMatch) return exactMatch;
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

      const targetAtom = findTargetAtom(call.name, callerAtom, index, fileImports);
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
