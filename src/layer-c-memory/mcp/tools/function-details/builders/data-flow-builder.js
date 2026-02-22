/**
 * @fileoverview Data Flow Builder - Construye sección de data flow
 */

/**
 * Construye la sección de data flow
 * @param {Object} atom - Átomo con metadata de data flow
 * @param {boolean} includeTransformations - Si incluir transformaciones
 * @returns {Object|null} - Sección de data flow o null
 */
export function buildDataFlowSection(atom, includeTransformations) {
  if (!atom.dataFlow) return null;

  const df = atom.dataFlow;

  const result = {
    inputs: (df.inputs || []).map(input => ({
      name: input.name,
      position: input.position,
      type: input.type,
      hasDefault: input.hasDefault,
      defaultValue: input.defaultValue,
      usageCount: input.usages?.length || 0
    })),
    outputs: (df.outputs || []).map(output => ({
      type: output.type,
      value: output.value,
      line: output.line,
      isSideEffect: output.type === 'side_effect'
    })),
    transformationCount: df.transformations?.length || 0,
    graph: df.graph?.meta || null,
    analysis: df.analysis || null
  };

  if (includeTransformations && df.transformations) {
    result.transformations = df.transformations.slice(0, 50).map(t => ({
      to: t.to,
      from: Array.isArray(t.from) ? t.from.slice(0, 3) : t.from,
      operation: t.operation,
      line: t.line,
      type: t.type
    }));
  }

  result.summary = {
    inputCount: result.inputs.length,
    outputCount: result.outputs.length,
    sideEffectsCount: result.outputs.filter(o => o.isSideEffect).length,
    returnCount: result.outputs.filter(o => o.type === 'return').length,
    throwCount: result.outputs.filter(o => o.type === 'throw').length
  };

  return result;
}
