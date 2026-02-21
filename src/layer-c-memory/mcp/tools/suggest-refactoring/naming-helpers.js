/**
 * Naming analysis helpers
 * @module mcp/tools/generate-tests/suggest-refactoring/naming-helpers
 */

/**
 * Genera un nombre de bloque basado en la transformación
 * @param {Object} transformation - Transformation object
 * @returns {string} - Suggested block name
 */
export function generateBlockName(transformation) {
  const op = transformation.operation;
  if (op.includes('filter')) return 'filter' + (transformation.to || 'Data');
  if (op.includes('map')) return 'transform' + (transformation.to || 'Data');
  if (op.includes('reduce')) return 'aggregate' + (transformation.to || 'Data');
  return 'process' + (transformation.to || 'Block');
}

/**
 * Genera un mejor nombre basado en el propósito y arquetipo
 * @param {Object} atom - Atom metadata
 * @returns {string} - Suggested better name
 */
export function generateBetterName(atom) {
  const purpose = atom.purpose;
  const archetype = atom.archetype?.type;
  
  if (archetype === 'utility') return atom.name + 'Utility';
  if (purpose === 'API_EXPORT') return 'handle' + atom.name.charAt(0).toUpperCase() + atom.name.slice(1);
  
  return atom.name + 'Refactored';
}

/**
 * Patrones de nombres pobres
 */
export const POOR_NAME_PATTERNS = [
  { pattern: /^[a-z]$/, reason: 'Single letter variable' },
  { pattern: /^(data|info|item|thing|stuff|temp|tmp)$/, reason: 'Generic/vague name' },
  { pattern: /^(handle|process|do|make)[A-Z]/, reason: 'Vague action verb' }
];
