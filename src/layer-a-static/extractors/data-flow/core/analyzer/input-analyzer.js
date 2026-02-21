/**
 * Input usage analysis utilities
 * @module extractors/data-flow/core/analyzer/input-analyzer
 */

/**
 * Checks if a specific input is used
 * @param {Object} input - Input object to check
 * @param {Array} transformations - Array of transformations
 * @param {Array} outputs - Array of outputs
 * @returns {boolean} - True if input is used
 */
export function isInputUsed(input, transformations, outputs) {
  if (input.usages && input.usages.length > 0) {
    return true;
  }

  if (input.properties && input.properties.length > 0) {
    for (const prop of input.properties) {
      const propUsed = transformations.some(t => 
        (Array.isArray(t.from) && t.from.includes(prop.local)) ||
        t.from === prop.local
      ) || outputs.some(o => 
        o.sources?.includes(prop.local)
      );
      if (propUsed) return true;
    }
  }

  const usedInTransformations = transformations.some(t => {
    const from = Array.isArray(t.from) ? t.from : [t.from];
    return from.includes(input.name) || from.includes(input.name);
  });

  if (usedInTransformations) return true;

  const usedInOutputs = outputs.some(o => 
    o.sources?.includes(input.name)
  );

  return usedInOutputs;
}

/**
 * Finds inputs that are not used
 * @param {Array} inputs - Array of input objects
 * @param {Array} transformations - Array of transformations
 * @param {Array} outputs - Array of outputs
 * @returns {Array} - Array of unused inputs
 */
export function findUnusedInputs(inputs, transformations, outputs) {
  const unused = [];

  for (const input of inputs) {
    const isUsed = isInputUsed(input, transformations, outputs);
    if (!isUsed) {
      unused.push({
        name: input.name,
        position: input.position,
        type: input.type
      });
    }
  }

  return unused;
}
