/**
 * Method filter utilities
 * @module mcp/tools/generate-tests/smart-test-generator/method-filter
 */

/**
 * Filtra métodos válidos basado en el impact map
 * @param {Array} methods - Array of methods
 * @param {string} className - Class name
 * @param {Object} impactMap - Impact map data
 * @returns {Array} - Filtered valid methods
 */
export function filterValidMethods(methods, className, impactMap) {
  if (!impactMap || !impactMap.definitions) {
    return methods;
  }
  
  const validMethodNames = new Set(
    impactMap.definitions
      .filter(d => d.type === 'method' && d.name.startsWith(`${className}.`))
      .map(d => d.name.replace(`${className}.`, ''))
  );
  
  return methods.filter(m => validMethodNames.has(m.name));
}
