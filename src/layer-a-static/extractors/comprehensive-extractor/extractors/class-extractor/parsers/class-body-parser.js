/**
 * @fileoverview Class Body Parser
 * 
 * @module class-extractor/parsers/class-body-parser
 */

/**
 * Extract class body from code
 * @param {string} code - Source code
 * @param {Object} cls - Class info with start position
 * @returns {string} Class body
 */
export function extractClassBody(code, cls) {
  const startIdx = code.indexOf('{', cls.start);
  if (startIdx === -1) return '';
  
  let braceCount = 1;
  let endIdx = startIdx + 1;
  
  while (braceCount > 0 && endIdx < code.length) {
    if (code[endIdx] === '{') braceCount++;
    if (code[endIdx] === '}') braceCount--;
    endIdx++;
  }
  
  return code.slice(startIdx + 1, endIdx - 1);
}

/**
 * Extract implements clause
 * @param {string} code - Source code
 * @param {Object} cls - Class info
 * @returns {Array} Implemented interfaces
 */
export function extractImplements(code, cls) {
  const classSignature = code.slice(cls.start, cls.start + 200);
  const implementsMatch = classSignature.match(/implements\s+([^{]+)/);
  
  if (implementsMatch) {
    return implementsMatch[1].split(',').map(i => i.trim());
  }
  
  return [];
}

/**
 * Extract decorators
 * @param {string} code - Source code
 * @param {Object} cls - Class info
 * @returns {Array} Decorators
 */
export function extractDecorators(code, cls) {
  const beforeClass = code.slice(Math.max(0, cls.start - 200), cls.start);
  const decorators = [];
  const decoratorPattern = /@(\w+)(?:\([^)]*\))?/g;
  let match;
  
  while ((match = decoratorPattern.exec(beforeClass)) !== null) {
    decorators.push({
      name: match[1],
      arguments: match[0].includes('(') ? match[0] : null
    });
  }
  
  return decorators;
}
