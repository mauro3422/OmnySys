/**
 * @fileoverview Import Resolver
 * Detects needed imports for tests
 * 
 * @module mcp/tools/generate-tests/branch-extractor/import-resolver
 */

/**
 * Detects which imports the test needs based on return expression and condition.
 * Looks for tokens like "Priority.CRITICAL", "ChangeType.DELETED" in atom imports.
 * 
 * @param {string} returnExpr - Return expression
 * @param {string} condition - Condition string
 * @param {Array} atomImports - Atom imports
 * @param {string} filePath - Source file path
 * @returns {Array} Needed imports
 */
export function resolveNeededImports(returnExpr, condition, atomImports, filePath) {
  const needed = [];
  const combined = `${returnExpr || ''} ${condition || ''}`;
  
  // Detect Member tokens: Word.Word
  const memberTokens = [...combined.matchAll(/\b([A-Z][a-zA-Z]+)\.([A-Z_]+)\b/g)];
  const objects = [...new Set(memberTokens.map(m => m[1]))];
  
  for (const objName of objects) {
    // Search in atom imports
    const imp = atomImports.find(i =>
      i.specifiers?.includes(objName) ||
      (i.source && i.source.includes(objName.toLowerCase()))
    );
    
    if (imp) {
      needed.push({ name: objName, from: imp.source });
    } else if (filePath) {
      // Fallback: build absolute path (src/…) so resolveImportAlias maps to alias #
      const dir = filePath.replace(/\\/g, '/').replace(/[^/]+$/, '');
      needed.push({ name: objName, from: `${dir}constants.js` });
    }
  }
  
  return needed;
}

/**
 * Checks if expression uses imported constant
 * @param {string} expr - Expression
 * @returns {boolean}
 */
export function usesImportedConstant(expr) {
  return /^[A-Z][a-zA-Z]+\.[A-Z_]+$/.test(expr);
}
