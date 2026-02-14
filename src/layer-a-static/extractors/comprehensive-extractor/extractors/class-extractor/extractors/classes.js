/**
 * @fileoverview classes.js
 * 
 * Main class extraction functionality
 * 
 * @module comprehensive-extractor/extractors/class-extractor/extractors/classes
 * @phase Layer A - Enhanced
 */

import { findClasses } from '../../parsers/ast-parser.js';
import { createLogger } from '#utils/logger.js';
import { extractClassBody, extractClassMethods, extractClassProperties } from '../parsers/class-body.js';
import { extractImplements, extractDecorators, calculateClassComplexity } from '../utils/class-helpers.js';
import { calculateInheritanceDepth } from '../utils/inheritance.js';

const logger = createLogger('OmnySys:class-extractor');

/**
 * Extract all classes from code
 * 
 * @param {string} code - Source code
 * @param {Object} options - Extraction options
 * @returns {Object} - Class extraction results
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
        staticMembers: methods.filter(m => m.isStatic).length + properties.filter(p => p.isStatic).length,
        privateMembers: methods.filter(m => m.isPrivate).length + properties.filter(p => p.isPrivate).length,
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

export { extractClassMethods, extractClassProperties };
