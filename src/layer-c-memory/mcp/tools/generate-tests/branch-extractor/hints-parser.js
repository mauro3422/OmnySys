/**
 * @fileoverview Input Hints Parser
 * Parses conditions into input hints for test generation
 * 
 * @module mcp/tools/generate-tests/branch-extractor/hints-parser
 */

/**
 * Converts an if condition into input hints
 * Examples:
 *   "changeType === ChangeType.DELETED" → { changeType: 'ChangeType.DELETED' }
 *   "options.priority !== undefined"    → { options: { priority: 99 } }
 *   "options.dependentCount > 20"       → { options: { dependentCount: 25 } }
 *   "options.exportChanges?.length > 0" → { options: { exportChanges: ['change'] } }
 * 
 * @param {string} condition - Condition string
 * @param {Array} atomInputs - Atom input definitions
 * @returns {Object} Input hints
 */
export function parseConditionToInputHints(condition, atomInputs) {
  if (!condition) return {};
  
  const hints = {};
  const inputNames = atomInputs.map(i => i.name);
  
  // Switch case shorthand: "=== Value" (no explicit param — param is switch subject)
  // Use first atom input as implicit param
  const switchMatch = condition.match(/^===\s*(.+)$/);
  if (switchMatch && inputNames.length > 0) {
    hints[inputNames[0]] = switchMatch[1].trim();
    return hints;
  }
  
  // === comparisons: param === Value
  const eqMatch = condition.match(/^(\w+(?:\.\w+)*)\s*===?\s*(.+)$/);
  if (eqMatch) {
    const [, lhs, rhs] = eqMatch;
    const paramName = resolveParamName(lhs, inputNames);
    if (paramName) {
      if (lhs.includes('.')) {
        setNestedHint(hints, lhs, rhs);
      } else {
        hints[paramName] = rhs.trim();
      }
    }
    return hints;
  }
  
  // !== undefined: param.field !== undefined
  const neqUndefined = condition.match(/^([\w.?]+)\s*!==?\s*undefined$/);
  if (neqUndefined) {
    const path = neqUndefined[1].replace(/\?/g, '');
    const paramName = resolveParamName(path, inputNames);
    if (paramName) {
      if (path.includes('.')) {
        const field = path.split('.').slice(1).join('.');
        hints[paramName] = hints[paramName] || {};
        setDeepValue(hints[paramName], field, 99);
      } else {
        hints[paramName] = 99;
      }
    }
    return hints;
  }
  
  // .length > 0 (must be checked BEFORE generic > threshold)
  const lengthMatch = condition.match(/^([\w.?]+)\.length\s*>\s*0$/);
  if (lengthMatch) {
    const path = lengthMatch[1].replace(/\?/g, '');
    const paramName = resolveParamName(path, inputNames);
    if (paramName) {
      if (path.includes('.')) {
        const field = path.split('.').slice(1).join('.');
        hints[paramName] = hints[paramName] || {};
        setDeepValue(hints[paramName], field, ['item']);
      } else {
        hints[paramName] = ['item'];
      }
    }
    return hints;
  }
  
  // > threshold: param.field > N
  const gtMatch = condition.match(/^([\w.?]+)\s*>\s*(\d+)$/);
  if (gtMatch) {
    const [, path, numStr] = gtMatch;
    const cleanPath = path.replace(/\?/g, '');
    const paramName = resolveParamName(cleanPath, inputNames);
    const threshold = parseInt(numStr, 10);
    const value = threshold + (threshold >= 10 ? 5 : 1); // > 20 → 25, > 5 → 6
    if (paramName) {
      if (cleanPath.includes('.')) {
        const field = cleanPath.split('.').slice(1).join('.');
        hints[paramName] = hints[paramName] || {};
        setDeepValue(hints[paramName], field, value);
      } else {
        hints[paramName] = value;
      }
    }
    return hints;
  }
  
  return hints;
}

/**
 * Finds root parameter name for a path like "options.priority"
 * @param {string} path - Parameter path
 * @param {string[]} inputNames - Available input names
 * @returns {string|null}
 */
function resolveParamName(path, inputNames) {
  const root = path.split('.')[0].replace(/\?/g, '');
  return inputNames.includes(root) ? root : null;
}

/**
 * Sets a nested value ("priority" → obj.priority = val)
 * @param {Object} obj - Target object
 * @param {string} fieldPath - Field path
 * @param {*} value - Value to set
 */
function setDeepValue(obj, fieldPath, value) {
  const parts = fieldPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/**
 * Sets nested hint
 * @param {Object} hints - Hints object
 * @param {string} lhs - Left-hand side
 * @param {string} rhs - Right-hand side
 */
function setNestedHint(hints, lhs, rhs) {
  const parts = lhs.split('.');
  const paramName = parts[0];
  hints[paramName] = hints[paramName] || {};
  setDeepValue(hints[paramName], parts.slice(1).join('.'), rhs.trim());
}
