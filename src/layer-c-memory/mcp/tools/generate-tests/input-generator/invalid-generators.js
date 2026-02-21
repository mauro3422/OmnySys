/**
 * Invalid input generators for edge cases
 * @module mcp/tools/generate-tests/input-generator/invalid-generators
 */

/**
 * Genera inputs inválidos para edge cases
 * @param {Array} inputs - Function inputs
 * @returns {Object} - Generated invalid inputs
 */
export function generateInvalidInputs(inputs) {
  if (!inputs || inputs.length === 0) return {};
  
  const result = {};
  for (const input of inputs) {
    result[input.name] = generateInvalidValue(input.type, input.name);
  }
  return result;
}

/**
 * Genera un valor invalido basado en el tipo
 * @param {string} type - Input type
 * @param {string} name - Input name
 * @returns {string} - Generated invalid value
 */
function generateInvalidValue(type, name) {
  const nameLower = name.toLowerCase();
  
  // Por nombre
  if (nameLower.includes('file') || nameLower.includes('path')) {
    return '"/nonexistent/path/to/file.js"';
  }
  if (nameLower.includes('callback') || nameLower.includes('fn')) {
    return 'null';
  }
  
  // Por tipo
  switch (type) {
    case 'string': return '123';
    case 'number': return '"not a number"';
    case 'boolean': return '"not a boolean"';
    case 'array': return '{}';
    case 'object':
    case 'Object': return '[]';
    default: return 'null';
  }
}
