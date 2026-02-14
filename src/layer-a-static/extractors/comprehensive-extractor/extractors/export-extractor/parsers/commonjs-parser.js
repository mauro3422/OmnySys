/**
 * @fileoverview CommonJS Parser
 * 
 * @module export-extractor/parsers/commonjs-parser
 */

/**
 * Parse CommonJS export assignments
 * @param {string} code - Source code
 * @returns {Array} Export assignments
 */
export function parseCommonJSExports(code) {
  const assignments = [];
  
  // module.exports = { ... }
  const moduleExportsPattern = /module\.exports\s*=\s*(\{[^}]*\}|\w+);?/g;
  let match;
  
  while ((match = moduleExportsPattern.exec(code)) !== null) {
    const exportedNames = match[1].startsWith('{') 
      ? extractObjectKeys(match[1])
      : [match[1]];
    
    assignments.push({
      type: 'module.exports',
      names: exportedNames,
      isObject: match[1].startsWith('{'),
      raw: match[0],
      start: match.index
    });
  }
  
  // exports.x = ...
  const exportsDotPattern = /exports\.(\w+)\s*=/g;
  while ((match = exportsDotPattern.exec(code)) !== null) {
    assignments.push({
      type: 'exports.property',
      name: match[1],
      raw: match[0],
      start: match.index
    });
  }
  
  // module.exports.x = ...
  const moduleDotPattern = /module\.exports\.(\w+)\s*=/g;
  while ((match = moduleDotPattern.exec(code)) !== null) {
    assignments.push({
      type: 'module.exports.property',
      name: match[1],
      raw: match[0],
      start: match.index
    });
  }
  
  return assignments;
}

/**
 * Extract object keys from literal
 */
function extractObjectKeys(objectLiteral) {
  const keys = [];
  const keyPattern = /(\w+)\s*:/g;
  let match;
  
  while ((match = keyPattern.exec(objectLiteral)) !== null) {
    keys.push(match[1]);
  }
  
  return keys;
}
