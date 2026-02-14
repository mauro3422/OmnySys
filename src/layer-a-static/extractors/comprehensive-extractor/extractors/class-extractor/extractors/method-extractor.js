/**
 * @fileoverview Method Extractor
 * 
 * @module class-extractor/extractors/method-extractor
 */

import { findMethods } from '../../../parsers/ast-parser.js';

/**
 * Extract class methods with detailed info
 * @param {string} classBody - Class body code
 * @returns {Array} Method definitions
 */
export function extractClassMethods(classBody) {
  if (!classBody) return [];
  
  const methods = findMethods(classBody);
  
  return methods.map(method => ({
    ...method,
    isStatic: isStaticMethod(classBody, method),
    isAbstract: isAbstractMethod(classBody, method),
    isOverride: isOverrideMethod(classBody, method),
    visibility: getVisibility(method),
    parameters: extractMethodParameters(classBody, method),
    returnType: extractMethodReturnType(classBody, method),
    hasJSDoc: hasMethodJSDoc(classBody, method)
  }));
}

/**
 * Check if method is static
 */
function isStaticMethod(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 30), method.start);
  return /\bstatic\b/.test(beforeMethod);
}

/**
 * Check if method is abstract
 */
function isAbstractMethod(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 30), method.start);
  return /\babstract\b/.test(beforeMethod);
}

/**
 * Check if method is override
 */
function isOverrideMethod(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 30), method.start);
  return /\boverride\b/.test(beforeMethod);
}

/**
 * Get method visibility
 */
function getVisibility(method) {
  if (method.name.startsWith('#')) return 'private';
  if (method.name.startsWith('_')) return 'protected';
  return 'public';
}

/**
 * Extract method parameters
 */
function extractMethodParameters(classBody, method) {
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
function extractMethodReturnType(classBody, method) {
  const methodStart = classBody.slice(method.start, method.start + 300);
  const returnMatch = methodStart.match(/\)\s*:\s*([^{]+)/);
  return returnMatch ? returnMatch[1].trim() : null;
}

/**
 * Check if method has JSDoc
 */
function hasMethodJSDoc(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 300), method.start);
  return /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeMethod);
}
