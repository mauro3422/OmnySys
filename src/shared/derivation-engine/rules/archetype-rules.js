/**
 * @fileoverview Archetype Derivation Rules
 * 
 * Reglas para derivar arquetipos moleculares desde átomos.
 * 
 * @module derivation-engine/rules/archetype-rules
 * @version 1.0.0
 */

/**
 * Deriva el arquetipo molecular desde arquetipos atómicos
 * @param {Array} atoms - Functions in the file
 * @returns {Object} - Derived archetype
 */
export function moleculeArchetype(atoms) {
  const atomArchetypes = atoms.map(a => a.archetype?.type).filter(Boolean);
  const exportedAtoms = atoms.filter(a => a.isExported);
  const networkAtoms = atoms.filter(a => a.hasNetworkCalls);

  // Rule 1: If has fragile-network atoms + multiple network calls → network-hub
  if (atomArchetypes.includes('fragile-network') && networkAtoms.length >= 2) {
    return {
      type: 'network-hub',
      severity: 8,
      confidence: 1.0,
      source: 'atomic-composition'
    };
  }

  // Rule 2: If all atoms are private (not exported) → internal-module
  if (atoms.length > 0 && exportedAtoms.length === 0) {
    return {
      type: 'internal-module',
      severity: 3,
      confidence: 1.0,
      source: 'atomic-composition'
    };
  }

  // Rule 3: If has multiple hot-path atoms → critical-module
  const hotPathCount = atomArchetypes.filter(t => t === 'hot-path').length;
  if (hotPathCount >= 2) {
    return {
      type: 'critical-module',
      severity: 9,
      confidence: 1.0,
      source: 'atomic-composition'
    };
  }

  // Rule 4: If has god-function → likely god-object at file level
  if (atomArchetypes.includes('god-function')) {
    return {
      type: 'god-object',
      severity: 10,
      confidence: 0.9,
      source: 'atomic-inference'
    };
  }

  // Rule 5: If has validator atoms → validation-module
  const validatorCount = atomArchetypes.filter(t => t === 'validator').length;
  if (validatorCount >= 2) {
    return {
      type: 'validation-module',
      severity: 4,
      confidence: 0.85,
      source: 'atomic-composition'
    };
  }

  // Default: standard module
  return {
    type: 'standard',
    severity: 1,
    confidence: 1.0,
    source: 'atomic-default'
  };
}

/**
 * Lista de arquetipos reconocidos
 */
export const ARCHETYPE_TYPES = [
  'network-hub',
  'internal-module',
  'critical-module',
  'god-object',
  'validation-module',
  'standard'
];

/**
 * Obtiene la severidad por defecto de un arquetipo
 * @param {string} type - Tipo de arquetipo
 * @returns {number} - Severidad
 */
export function getDefaultSeverity(type) {
  const severities = {
    'god-object': 10,
    'critical-module': 9,
    'network-hub': 8,
    'validation-module': 4,
    'internal-module': 3,
    'standard': 1
  };
  return severities[type] || 1;
}
