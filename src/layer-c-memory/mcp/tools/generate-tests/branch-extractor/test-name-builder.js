/**
 * @fileoverview Test Name Builder
 * Generates descriptive test names for branches
 * 
 * @module mcp/tools/generate-tests/branch-extractor/test-name-builder
 */

/**
 * Generates descriptive test name for a branch
 * 
 * @param {string} condition - Condition string
 * @param {string} returnExpr - Return expression
 * @param {string} fnName - Function name
 * @returns {string} Test name
 */
export function buildTestName(condition, returnExpr, fnName) {
  if (!condition) {
    return `should return ${sanitizeName(returnExpr)} as default`;
  }
  
  // Switch case shorthand: "=== Value"
  const switchMatch = condition.match(/^===\s*(.+)$/);
  if (switchMatch) {
    return `should return ${sanitizeName(returnExpr)} when input is ${sanitizeName(switchMatch[1])}`;
  }
  
  // === comparisons: param === Value
  const eqMatch = condition.match(/^(\w+)\s*===?\s*(.+)$/);
  if (eqMatch) {
    return `should return ${sanitizeName(returnExpr)} when ${eqMatch[1]} is ${sanitizeName(eqMatch[2])}`;
  }
  
  // !== undefined
  if (condition.includes('!== undefined') || condition.includes('!= undefined')) {
    const param = condition.split(/\s*!=/)[0].replace(/\?/g, '').trim();
    return `should return ${sanitizeName(returnExpr)} when ${param} is provided`;
  }
  
  // > threshold
  const gtMatch = condition.match(/^([\w.?]+)\s*>\s*(\d+)$/);
  if (gtMatch) {
    return `should return ${sanitizeName(returnExpr)} when ${sanitizeName(gtMatch[1])} exceeds ${gtMatch[2]}`;
  }
  
  // .length > 0
  const lenMatch = condition.match(/^([\w.?]+)\.length\s*>\s*0$/);
  if (lenMatch) {
    return `should return ${sanitizeName(returnExpr)} when ${sanitizeName(lenMatch[1])} is non-empty`;
  }
  
  return `should return ${sanitizeName(returnExpr)} when ${condition.slice(0, 40)}`;
}

/**
 * Sanitizes expression for use in test name
 * @param {string} expr - Expression
 * @returns {string} Sanitized name
 */
export function sanitizeName(expr) {
  if (!expr) return 'value';
  return expr.replace(/['"]/g, '').replace(/\s+/g, ' ').slice(0, 40);
}
