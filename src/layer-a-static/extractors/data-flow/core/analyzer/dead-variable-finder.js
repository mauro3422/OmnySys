/**
 * Dead variable detection utilities
 * @module extractors/data-flow/core/analyzer/dead-variable-finder
 */

/**
 * Finds dead variables (defined but not used)
 * @param {Array} transformations - Array of transformations
 * @param {Array} outputs - Array of outputs
 * @param {Array} inputs - Array of inputs
 * @returns {Array} - Array of dead variables
 */
export function findDeadVariables(transformations, outputs, inputs) {
  const dead = [];
  const definedVars = new Set();
  const usedVars = new Set();

  for (const t of transformations) {
    if (t.to && !t.to.startsWith('<')) {
      definedVars.add(t.to);
    }
  }

  for (const t of transformations) {
    const from = Array.isArray(t.from) ? t.from : [t.from];
    from.forEach(f => {
      if (f && typeof f === 'string' && !f.startsWith('<')) {
        usedVars.add(f.split('.')[0]);
      }
    });
  }

  for (const o of outputs) {
    if (o.sources) {
      o.sources.forEach(s => {
        if (s && typeof s === 'string') {
          usedVars.add(s.split('.')[0]);
        }
      });
    }
  }

  for (const input of inputs) {
    usedVars.add(input.name);
  }

  for (const defined of definedVars) {
    if (!usedVars.has(defined)) {
      const def = transformations.find(t => t.to === defined);
      dead.push({
        name: defined,
        definedAt: def?.line,
        operation: def?.operation
      });
    }
  }

  return dead;
}
