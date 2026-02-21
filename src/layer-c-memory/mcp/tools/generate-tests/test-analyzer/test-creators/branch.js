/**
 * Branch-based test creator
 * @module mcp/tools/generate-tests/test-analyzer/test-creators/branch
 */

/**
 * Convierte un hint de input a código JS válido
 * @param {*} hint - Input hint value
 * @returns {string} - JS code string
 */
function hintToJsCode(hint) {
  if (hint === null || hint === undefined) return 'null';
  if (typeof hint === 'number' || typeof hint === 'boolean') return String(hint);
  if (typeof hint === 'string') {
    if (/^[A-Z]\w*\.[A-Z_]+$/.test(hint)) return hint;
    if (/^\d+(\.\d+)?$/.test(hint))        return hint;
    if (/^["']/.test(hint))                return hint;
    if (/^(null|undefined|true|false)$/.test(hint)) return hint;
    return `'${hint.replace(/'/g, "\\'")}'`;
  }
  if (Array.isArray(hint)) {
    return `[${hint.map(hintToJsCode).join(', ')}]`;
  }
  if (typeof hint === 'object') {
    const pairs = Object.entries(hint)
      .map(([k, v]) => `${k}: ${hintToJsCode(v)}`)
      .join(', ');
    return `{ ${pairs} }`;
  }
  return String(hint);
}

/**
 * Convierte branches extraídos en test cases
 * @param {Array} branches - Array of branch objects
 * @param {Object} atom - Atom metadata
 * @returns {Array} - Array of branch tests
 */
export function createBranchTests(branches, atom) {
  return branches.map(branch => {
    const inputs = {};
    for (const [param, hint] of Object.entries(branch.inputHints || {})) {
      inputs[param] = hintToJsCode(hint);
    }

    return {
      name: branch.testName,
      type: 'branch',
      description: `Branch: ${branch.condition || 'default'} → return ${branch.returnExpr}`,
      inputs,
      assertion: branch.assertion,
      neededImports: branch.neededImports,
      priority: branch.condition ? 'high' : 'medium',
      source: 'branch-extraction'
    };
  });
}
