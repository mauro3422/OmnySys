/**
 * @fileoverview function-linker.js
 *
 * Builds cross-file calledBy links by matching function calls
 * across all atoms using a multi-level lookup index.
 *
 * @module pipeline/phases/calledby/function-linker
 */



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
 * Finds the best matching target atom for a call.
 * @param {string} callName
 * @param {Object} callerAtom
 * @param {{ bySimpleName: Map, byQualifiedName: Map }} index
 * @returns {Object|null}
 */
export function findTargetAtom(callName, callerAtom, index) {
  if (callName && callName.includes('.')) {
    return index.byQualifiedName.get(callName) || null;
  }

  const candidates = index.bySimpleName.get(callName) || [];
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Prefer exported, then cross-file
  const exported = candidates.find(a => a.isExported);
  if (exported) return exported;
  const differentFile = candidates.find(a => a.filePath !== callerAtom.filePath);
  return differentFile || candidates[0];
}

/**
 * Links calledBy for function/method calls across all atoms.
 * Mutates atoms in place, then persists updated atoms to disk.
 *
 * @param {Object[]} allAtoms
 * @param {string} absoluteRootPath
 * @param {Object} index - from buildAtomIndex()
 * @param {boolean} verbose
 * @returns {Promise<{ crossFileLinks: number, intraFileLinks: number }>}
 */
export async function linkFunctionCalledBy(allAtoms, absoluteRootPath, index, verbose) {
  let crossFileLinks = 0;
  let intraFileLinks = 0;

  for (const callerAtom of allAtoms) {
    const allCalls = [
      ...(callerAtom.calls || []),
      ...(callerAtom.internalCalls || []),
      ...(callerAtom.externalCalls || [])
    ];

    for (const call of allCalls) {
      if (!call.name) continue;

      const targetAtom = findTargetAtom(call.name, callerAtom, index);
      if (!targetAtom || targetAtom.id === callerAtom.id) continue;

      if (!targetAtom.calledBy) targetAtom.calledBy = [];
      if (!targetAtom.calledBy.includes(callerAtom.id)) {
        targetAtom.calledBy.push(callerAtom.id);
        if (targetAtom.filePath !== callerAtom.filePath) crossFileLinks++;
        else intraFileLinks++;
      }
    }
  }

  // Recompute changeRisk for updated atoms (sin guardar - se hace bulk al final)
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
    const logger = (await import('#utils/logger.js')).createLogger('OmnySys:indexer');
    logger.info(`  ✓ ${crossFileLinks} cross-file + ${intraFileLinks} intra-file calledBy links (${updatedAtoms.length} atoms updated)`);
  }

  return { crossFileLinks, intraFileLinks, updatedAtoms };
}
