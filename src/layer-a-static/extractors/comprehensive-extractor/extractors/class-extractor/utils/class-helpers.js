/**
 * @fileoverview class-helpers.js
 * 
 * Class analysis helper functions
 * 
 * @module comprehensive-extractor/extractors/class-extractor/utils/class-helpers
 */

/**
 * Extract interface implementations
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
 * Extract class decorators
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

/**
 * Calculate class complexity based on methods
 */
export function calculateClassComplexity(methods) {
  if (!methods.length) return 0;
  
  const totalMethodComplexity = methods.reduce((sum, m) => {
    return sum + (m.parameters?.length || 0) + (m.type === 'getter' ? 1 : 2);
  }, 0);
  
  return Math.round(totalMethodComplexity / methods.length);
}
