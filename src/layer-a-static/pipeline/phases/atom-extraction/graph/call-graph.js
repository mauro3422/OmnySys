/**
 * @fileoverview call-graph.js
 *
 * Call graph building for atoms (internal/external classification + calledBy)
 *
 * @module pipeline/phases/atom-extraction/graph/call-graph
 */

/**
 * Build call graph relationships between atoms
 * @param {Array} atoms - Array of atom metadata
 */
export function buildCallGraph(atoms) {
  const atomByName = new Map(atoms.map(a => [a.name, a]));
  const definedFunctions = new Set(atoms.map(a => a.name));

  // Build a map of short method names to atoms that belong to each class
  // For tracking this.method() calls between sibling class methods
  const classMethodsByName = new Map();
  atoms.forEach(atom => {
    if (atom.className) {
      const key = `${atom.className}::${atom.name}`;
      classMethodsByName.set(key, atom);
    }
  });

  // First pass: classify calls
  atoms.forEach(atom => {
    atom.calls.forEach(call => {
      call.type = definedFunctions.has(call.name) ? 'internal' : 'external';
    });
    // Sync externalCallCount with actual classified calls (fixes #3 - was stuck at 0)
    atom.externalCallCount = atom.calls.filter(c => c.type === 'external').length;
  });

  // Second pass: build calledBy
  atoms.forEach(atom => { atom.calledBy = []; });

  atoms.forEach(callerAtom => {
    callerAtom.calls.forEach(call => {
      if (call.type === 'internal') {
        const targetAtom = atomByName.get(call.name);
        if (targetAtom && targetAtom.id !== callerAtom.id) {
          if (!targetAtom.calledBy.includes(callerAtom.id)) {
            targetAtom.calledBy.push(callerAtom.id);
          }
        }
      }

      // Track this.method() calls between sibling class methods
      // When a class method calls another method by bare name, check if
      // there's a sibling in the same class
      if (callerAtom.className) {
        const siblingKey = `${callerAtom.className}::${call.name}`;
        const siblingAtom = classMethodsByName.get(siblingKey);
        if (siblingAtom && siblingAtom.id !== callerAtom.id) {
          if (!siblingAtom.calledBy.includes(callerAtom.id)) {
            siblingAtom.calledBy.push(callerAtom.id);
          }
        }
      }
    });
  });
}

export default buildCallGraph;
