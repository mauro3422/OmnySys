/**
 * @fileoverview method-helpers.js
 * 
 * Method analysis helper functions
 * 
 * @module comprehensive-extractor/extractors/class-extractor/utils/method-helpers
 */

/**
 * Check if method is static
 */
export function isStaticMethod(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 30), method.start);
  return /\bstatic\b/.test(beforeMethod);
}

/**
 * Check if method is abstract
 */
export function isAbstractMethod(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 30), method.start);
  return /\babstract\b/.test(beforeMethod);
}

/**
 * Check if method is override
 */
export function isOverrideMethod(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 30), method.start);
  return /\boverride\b/.test(beforeMethod);
}

/**
 * Get method visibility
 */
export function getVisibility(method) {
  if (method.name.startsWith('#')) return 'private';
  if (method.name.startsWith('_')) return 'protected';
  return 'public';
}

/**
 * Extract method parameters
 */
export function extractMethodParameters(classBody, method) {
  const methodStart = classBody.slice(method.start, method.start + 200);
  const paramsMatch = methodStart.match(/\(([^)]*)\)/);
  
  if (!paramsMatch) return [];
  
  return paramsMatch[1].split(',').map(p => {
    const trimmed = p.trim();
    if (!trimmed) return null;
    
    const parts = trimmed.split(/\s*:\s*/);
    const nameParts = parts[0].split(/\s*=\s*/);
    
    return {
      name: nameParts[0].replace(/[^\w]/g, ''),
      type: parts[1] || null,
      hasDefault: nameParts.length > 1,
      defaultValue: nameParts[1] || null
    };
  }).filter(Boolean);
}

/**
 * Extract method return type
 */
export function extractMethodReturnType(classBody, method) {
  const methodStart = classBody.slice(method.start, method.start + 300);
  const returnMatch = methodStart.match(/\)\s*:\s*([^{]+)/);
  return returnMatch ? returnMatch[1].trim() : null;
}

/**
 * Check if method has JSDoc
 */
export function hasMethodJSDoc(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 300), method.start);
  return /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeMethod);
}
