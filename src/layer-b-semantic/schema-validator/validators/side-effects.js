/**
 * Side Effects Validator
 */

const VALID_KEYS = [
  'hasGlobalAccess',
  'modifiesDOM',
  'makesNetworkCalls',
  'usesLocalStorage',
  'accessesWindow',
  'modifiesGlobalState',
  'hasEventListeners',
  'usesTimers'
];

/**
 * Valida side effects
 * @param {object} sideEffects - Side effects a validar
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateSideEffects(sideEffects) {
  const errors = [];

  for (const key of Object.keys(sideEffects)) {
    if (!VALID_KEYS.includes(key)) {
      errors.push(`Invalid side effect key: ${key}`);
    }
    if (typeof sideEffects[key] !== 'boolean') {
      errors.push(`Invalid side effect value for ${key}: ${sideEffects[key]}. Must be boolean`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
