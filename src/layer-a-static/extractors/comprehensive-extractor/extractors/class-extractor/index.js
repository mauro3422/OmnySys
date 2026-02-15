/**
 * @fileoverview Class Extractor - Main Entry Point
 * 
 * Extracts class declarations, inheritance, methods, and properties
 * 
 * @module class-extractor
 */

import { findClasses, findMethods } from '../../parsers/ast-parser.js';
import { createLogger } from '#utils/logger.js';
import { extractClassBody, extractImplements, extractDecorators } from './parsers/class-body-parser.js';
import { extractClassMethods } from './extractors/method-extractor.js';
import { extractClassProperties } from './extractors/property-extractor.js';
import { extractInheritanceHierarchy, calculateInheritanceDepth, extractMixins } from './extractors/inheritance-extractor.js';

const logger = createLogger('OmnySys:class-extractor');

/**
 * Calculate class complexity
 * @param {Array} methods - Class methods
 * @returns {number} Complexity score
 */
function calculateClassComplexity(methods) {
  if (!methods.length) return 0;
  
  const totalMethodComplexity = methods.reduce((sum, m) => {
    return sum + (m.parameters?.length || 0) + (m.type === 'getter' ? 1 : 2);
  }, 0);
  
  return Math.round(totalMethodComplexity / methods.length);
}

/**
 * Extract all classes from code
 * @param {string} code - Source code
 * @param {Object} options - Extraction options
 * @returns {Object} Extraction results
 */
export function extractClasses(code, options = {}) {
  try {
    const classes = findClasses(code);
    
    const detailedClasses = classes.map(cls => {
      const classBody = extractClassBody(code, cls);
      const methods = extractClassMethods(classBody);
      const properties = extractClassProperties(classBody);
      
      return {
        ...cls,
        methods,
        properties,
        isAbstract: /abstract\s+class/.test(code.slice(Math.max(0, cls.start - 20), cls.start)),
        implements: extractImplements(code, cls),
        decorators: extractDecorators(code, cls),
        hasConstructor: methods.some(m => m.name === 'constructor'),
        staticMembers: countStaticMembers(methods, properties),
        privateMembers: countPrivateMembers(methods, properties),
        complexity: calculateClassComplexity(methods)
      };
    });
    
    return {
      classes: detailedClasses,
      count: detailedClasses.length,
      inheritanceDepth: calculateInheritanceDepth(detailedClasses),
      hasAbstractClasses: detailedClasses.some(c => c.isAbstract),
      hasInterfaces: /interface\s+\w+/.test(code),
      _metadata: {
        extractedAt: new Date().toISOString(),
        success: true
      }
    };
  } catch (error) {
    logger.warn(`Error extracting classes: ${error.message}`);
    return {
      classes: [],
      count: 0,
      _metadata: { error: error.message, success: false }
    };
  }
}

/**
 * Count static members
 */
function countStaticMembers(methods, properties) {
  return methods.filter(m => m.isStatic).length + 
         properties.filter(p => p.isStatic).length;
}

/**
 * Count private members
 */
function countPrivateMembers(methods, properties) {
  return methods.filter(m => m.isPrivate).length + 
         properties.filter(p => p.isPrivate).length;
}

// Re-export all functions
export { extractClassMethods } from './extractors/method-extractor.js';
export { extractClassProperties } from './extractors/property-extractor.js';
export { extractInheritanceHierarchy, calculateInheritanceDepth, extractMixins } from './extractors/inheritance-extractor.js';
export { extractClassBody, extractImplements, extractDecorators } from './parsers/class-body-parser.js';

// Default export
export default {
  extractClasses,
  extractClassMethods,
  extractClassProperties,
  extractInheritanceHierarchy,
  extractMixins
};
