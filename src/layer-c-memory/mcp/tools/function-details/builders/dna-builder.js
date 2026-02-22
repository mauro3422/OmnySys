/**
 * @fileoverview DNA Builder - Construye sección de DNA
 */

/**
 * Construye la sección de DNA
 * @param {Object} atom - Átomo con DNA
 * @returns {Object|null} - Sección de DNA o null
 */
export function buildDnaSection(atom) {
  if (!atom.dna) return null;

  return {
    structuralHash: atom.dna.structuralHash,
    patternHash: atom.dna.patternHash,
    flowType: atom.dna.flowType,
    complexityScore: atom.dna.complexityScore,
    semanticFingerprint: atom.dna.semanticFingerprint,
    inputCount: atom.dna.inputCount,
    outputCount: atom.dna.outputCount,
    transformationCount: atom.dna.transformationCount,
    operationSequenceLength: atom.dna.operationSequence?.length || 0
  };
}
