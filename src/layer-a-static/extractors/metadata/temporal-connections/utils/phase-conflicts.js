/**
 * @fileoverview Phase Conflict Detector
 * 
 * Detects conflicts between functions in same lifecycle phase.
 * 
 * @module temporal-connections/utils
 */

/**
 * Detects conflicts between functions in same lifecycle phase
 * @param {Array} atoms - Function atoms
 * @returns {Array} Phase conflict connections
 */
export function detectPhaseConflicts(atoms) {
  const connections = [];
  
  // Collect all hooks grouped by phase
  const hooksByPhase = {};
  
  for (const atom of atoms) {
    const hooks = atom.temporal?.lifecycleHooks || [];
    for (const hook of hooks) {
      if (!hooksByPhase[hook.phase]) hooksByPhase[hook.phase] = [];
      hooksByPhase[hook.phase].push({ atom, hook });
    }
  }

  // Create conflict connections for shared phases
  for (const [phase, phaseHooks] of Object.entries(hooksByPhase)) {
    if (phaseHooks.length > 1) {
      for (let i = 0; i < phaseHooks.length; i++) {
        for (let j = i + 1; j < phaseHooks.length; j++) {
          connections.push({
            type: 'temporal-constraint',
            from: phaseHooks[i].atom.id,
            to: phaseHooks[j].atom.id,
            relationship: 'same-execution-phase',
            phase,
            potentialRace: true,
            confidence: 0.6
          });
        }
      }
    }
  }

  return connections;
}

/**
 * Groups atoms by their lifecycle phases
 * @param {Array} atoms - Function atoms
 * @returns {Object} Atoms grouped by phase
 */
export function groupAtomsByPhase(atoms) {
  const byPhase = {};
  
  for (const atom of atoms) {
    const hooks = atom.temporal?.lifecycleHooks || [];
    for (const hook of hooks) {
      if (!byPhase[hook.phase]) byPhase[hook.phase] = new Set();
      byPhase[hook.phase].add(atom);
    }
  }
  
  // Convert sets to arrays
  return Object.fromEntries(
    Object.entries(byPhase).map(([phase, set]) => [phase, Array.from(set)])
  );
}

/**
 * Checks if two atoms share any lifecycle phase
 * @param {Object} atom1 - First atom
 * @param {Object} atom2 - Second atom
 * @returns {Array} Shared phases
 */
export function getSharedPhases(atom1, atom2) {
  const phases1 = new Set(atom1.temporal?.lifecycleHooks?.map(h => h.phase) || []);
  const phases2 = new Set(atom2.temporal?.lifecycleHooks?.map(h => h.phase) || []);
  
  return Array.from(phases1).filter(p => phases2.has(p));
}

/**
 * Detects potential race conditions
 * @param {Array} atoms - Function atoms
 * @returns {Array} Potential race conditions
 */
export function detectRaceConditions(atoms) {
  const races = [];
  const byPhase = groupAtomsByPhase(atoms);
  
  for (const [phase, phaseAtoms] of Object.entries(byPhase)) {
    if (phaseAtoms.length > 1 && ['mount', 'render', 'effect'].includes(phase)) {
      for (let i = 0; i < phaseAtoms.length; i++) {
        for (let j = i + 1; j < phaseAtoms.length; j++) {
          races.push({
            type: 'potential-race',
            phase,
            between: [phaseAtoms[i].id, phaseAtoms[j].id],
            reason: 'Same execution phase without explicit ordering'
          });
        }
      }
    }
  }
  
  return races;
}
