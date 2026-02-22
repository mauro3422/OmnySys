/**
 * @fileoverview Type Contracts Builder - Construye sección de contratos de tipos
 */

/**
 * Construye la sección de contratos de tipos
 * @param {Object} atom - Átomo con metadata de type contracts
 * @returns {Object|null} - Sección de type contracts o null
 */
export function buildTypeContractsSection(atom) {
  if (!atom.typeContracts) return null;

  const tc = atom.typeContracts;

  return {
    signature: tc.signature,
    params: tc.params || [],
    returns: tc.returns,
    throws: tc.throws || [],
    generics: tc.generics || [],
    confidence: tc.confidence
  };
}
