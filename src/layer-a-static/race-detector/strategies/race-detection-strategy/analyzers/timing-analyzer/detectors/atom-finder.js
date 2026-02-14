/**
 * @fileoverview atom-finder.js
 * 
 * Atom lookup utilities
 * 
 * @module race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/detectors/atom-finder
 */

/**
 * Get callers of an atom
 * 
 * @param {string} atomId - Atom identifier
 * @param {Object} project - Project data
 * @returns {Array<string>} - Array of atom IDs that call this atom
 */
export function getAtomCallers(atomId, project) {
  const callers = [];
  const atomName = atomId.split('::')[1];
  
  for (const module of project.modules || []) {
    for (const molecule of module.files || []) {
      for (const atom of molecule.atoms || []) {
        if (atom.calls?.some(call => call.name === atomName)) {
          callers.push(atom.id);
        }
      }
    }
  }
  
  return [...new Set(callers)];
}

/**
 * Find entry points for an atom
 * 
 * @param {string} atomId - Atom identifier
 * @param {Object} project - Project data
 * @returns {Array<string>} - Entry point atom IDs
 */
export function findEntryPoints(atomId, project) {
  const entryPoints = [];
  const visited = new Set();
  const queue = [atomId];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    
    const callers = getAtomCallers(current, project);
    
    for (const caller of callers) {
      const [, name] = caller.split('::');
      if (name && name[0] === name[0].toUpperCase()) {
        entryPoints.push(caller);
      } else {
        queue.push(caller);
      }
    }
  }
  
  return entryPoints;
}

/**
 * Find atom by ID
 * 
 * @param {string} atomId - Atom identifier
 * @param {Object} project - Project data
 * @returns {Object|null} - Atom data or null
 */
export function findAtomById(atomId, project) {
  for (const module of project.modules || []) {
    for (const molecule of module.files || []) {
      for (const atom of molecule.atoms || []) {
        if (atom.id === atomId || 
            `${molecule.filePath}::${atom.name}` === atomId) {
          return atom;
        }
      }
    }
  }
  return null;
}
