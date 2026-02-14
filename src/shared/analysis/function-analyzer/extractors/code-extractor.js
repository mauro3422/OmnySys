/**
 * @fileoverview Function Code Extractor
 * 
 * Extracts function code from source
 * 
 * @module function-analyzer/extractors/code-extractor
 */

/**
 * Extract function code from file
 * @param {string} code - Full source code
 * @param {Object} funcDef - Function definition
 * @returns {string} Function code
 */
export function extractFunctionCode(code, funcDef) {
  if (!funcDef.line || !funcDef.endLine) return '';
  
  const lines = code.split('\n');
  const startLine = Math.max(0, funcDef.line - 1);
  const endLine = Math.min(lines.length, funcDef.endLine);
  
  return lines.slice(startLine, endLine).join('\n');
}

/**
 * Extract function signature
 * @param {string} functionCode - Function code
 * @returns {string} Signature
 */
export function extractFunctionSignature(functionCode) {
  const match = functionCode.match(/^(?:async\s+)?function\s*\*?\s*(\w*)\s*\(([^)]*)\)/);
  if (match) {
    return {
      name: match[1],
      params: match[2].split(',').map(p => p.trim()).filter(Boolean)
    };
  }
  
  const arrowMatch = functionCode.match(/^(?:async\s+)?(?:\(([^)]*)\)|(\w+))\s*=>/);
  if (arrowMatch) {
    return {
      name: '',
      params: (arrowMatch[1] || arrowMatch[2] || '').split(',').map(p => p.trim()).filter(Boolean)
    };
  }
  
  return { name: '', params: [] };
}
