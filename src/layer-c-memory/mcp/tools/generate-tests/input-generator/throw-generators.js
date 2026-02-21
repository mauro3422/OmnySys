/**
 * Throw condition generators
 * @module mcp/tools/generate-tests/input-generator/throw-generators
 */

/**
 * Analiza una condición de throw y genera inputs para dispararla
 * @param {string} condition - Throw condition string
 * @param {Object} thrown - Throw metadata
 * @param {Object} atom - Atom metadata
 * @returns {Object} - Generated throw-triggering inputs
 */
export function analyzeThrowCondition(condition, thrown, atom) {
  const result = {};
  const condLower = condition.toLowerCase();
  const callsList = atom?.callGraph?.callsList || [];
  
  // !safety.safe -> mock del safety validator para que falle
  if (condLower.includes('safety')) {
    result.options = generateFailingSafetyOptions(atom);
  }
  
  // !result.success / !validation.valid -> operación inválida
  if (condLower.includes('result') || condLower.includes('success') || condLower.includes('valid')) {
    result.operation = '{ type: "edit", filePath: "/test/file.js", oldString: "old", newString: "new", validate: vi.fn().mockResolvedValue({ valid: false, error: "test error" }) }';
  }
  
  // !syntax.valid -> mock del syntax validator para que falle
  if (condLower.includes('syntax')) {
    result.options = generateFailingSyntaxOptions(atom);
  }
  
  // null/undefined checks
  if (condLower.includes('!') && (condLower.includes('null') || condLower.includes('undefined'))) {
    for (const input of atom?.dataFlow?.inputs || []) {
      result[input.name] = 'null';
    }
  }
  
  // empty string/array
  if (condLower.includes('empty')) {
    for (const input of atom?.dataFlow?.inputs || []) {
      if (input.name.toLowerCase().includes('string') || input.name.toLowerCase().includes('text')) {
        result[input.name] = '""';
      } else if (input.name.toLowerCase().includes('array') || input.name.toLowerCase().includes('list')) {
        result[input.name] = '[]';
      }
    }
  }
  
  return result;
}

/**
 * Genera options con safety validator que falla
 * @param {Object} atom - Atom metadata
 * @returns {string} - Generated failing safety options
 */
export function generateFailingSafetyOptions(atom) {
  const callsList = atom?.callGraph?.callsList || [];
  const hasEmit = callsList.some(c => c.name === 'emit');
  
  let options = `validators: { safety: { validateEdit: vi.fn().mockResolvedValue({ safe: false, error: "Safety check failed" }) } }, enableSafetyChecks: true`;
  
  if (hasEmit) {
    options += `, emit: vi.fn()`;
  }
  
  return `{ ${options} }`;
}

/**
 * Genera options con syntax validator que falla
 * @param {Object} atom - Atom metadata
 * @returns {string} - Generated failing syntax options
 */
export function generateFailingSyntaxOptions(atom) {
  const callsList = atom?.callGraph?.callsList || [];
  const hasEmit = callsList.some(c => c.name === 'emit');
  
  let options = `validators: { syntax: { validate: vi.fn().mockResolvedValue({ valid: false, error: "Syntax error" }) } }, enableSyntaxValidation: true`;
  
  if (hasEmit) {
    options += `, emit: vi.fn()`;
  }
  
  return `{ ${options} }`;
}
