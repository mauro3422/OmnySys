/**
 * @fileoverview Class Parser - Parseo de clases
 * 
 * @module parsers/classes
 */

/**
 * Find all class declarations in code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of class info
 */
export function findClasses(code) {
  const classes = [];
  
  // Class declarations
  const classPattern = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g;
  let match;
  while ((match = classPattern.exec(code)) !== null) {
    classes.push({
      type: 'ClassDeclaration',
      name: match[1],
      superClass: match[2] || null,
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return classes;
}

/**
 * Extract method definitions from a class body
 * 
 * @param {string} classBody - Class body code
 * @returns {Array} - Array of method definitions
 */
export function findMethods(classBody) {
  const methods = [];
  
  // Method definitions
  const methodPattern = /(?:async\s+)?(?:(?:get|set)\s+)?(\w+|\[\s*[^\]]+\s*\])\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = methodPattern.exec(classBody)) !== null) {
    const isGetter = match[0].includes('get ');
    const isSetter = match[0].includes('set ');
    const isAsync = match[0].includes('async ');
    
    methods.push({
      type: isGetter ? 'getter' : isSetter ? 'setter' : 'method',
      name: match[1].replace(/[\[\]\s']/g, ''),
      isAsync,
      isStatic: false,
      isPrivate: match[1].startsWith('#'),
      start: match.index
    });
  }
  
  // Arrow methods: methodName = () => {}
  const arrowMethodPattern = /(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
  while ((match = arrowMethodPattern.exec(classBody)) !== null) {
    methods.push({
      type: 'arrow',
      name: match[1],
      isAsync: match[0].includes('async'),
      isStatic: false,
      start: match.index
    });
  }
  
  return methods;
}

/**
 * Find class properties
 * @param {string} classBody - Class body code
 * @returns {Array} Properties
 */
export function findClassProperties(classBody) {
  const properties = [];
  
  // Property declarations
  const propPattern = /(?:static\s+)?(\w+)\s*[=:]/g;
  let match;
  while ((match = propPattern.exec(classBody)) !== null) {
    properties.push({
      name: match[1],
      isStatic: match[0].includes('static '),
      start: match.index
    });
  }
  
  return properties;
}
