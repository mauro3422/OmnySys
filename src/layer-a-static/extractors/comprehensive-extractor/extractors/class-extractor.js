/**
 * @fileoverview class-extractor.js
 * 
 * Class Extractor - Extracts class-related constructs
 * Handles class declarations, inheritance, methods, and properties
 * 
 * @module comprehensive-extractor/extractors/class-extractor
 * @phase Layer A - Enhanced
 */

import { findClasses, findMethods } from '../parsers/ast-parser.js';
import { createLogger } from '#utils/logger.js';

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

/**
 * Extract class methods with detailed info
 * 
 * @param {string} classBody - Class body code
 * @returns {Array} - Array of method definitions
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
 * Extract class properties/fields
 * 
 * @param {string} classBody - Class body code
 * @returns {Array} - Array of property definitions
 */
export function extractClassProperties(classBody) {
  if (!classBody) return [];
  
  const properties = [];
  
  // Public properties
  const propPattern = /(?:(static|readonly)\s+)?(?!constructor|if|while|for|switch)(\w+)\s*[:=]/g;
  let match;
  
  while ((match = propPattern.exec(classBody)) !== null) {
    const isStatic = match[1] === 'static';
    const isReadonly = match[1] === 'readonly';
    const name = match[2];
    
    // Skip method definitions
    if (classBody.slice(match.index + match[0].length).trim().startsWith('(')) continue;
    
    properties.push({
      name,
      isStatic,
      isReadonly,
      visibility: name.startsWith('#') ? 'private' : name.startsWith('_') ? 'protected' : 'public',
      type: extractPropertyType(classBody, match.index + match[0].length)
    });
  }
  
  // TypeScript property declarations: name: type
  const tsPropPattern = /(?:(static|readonly|private|protected|public)\s+)*(\w+)\s*:\s*(\w+)/g;
  while ((match = tsPropPattern.exec(classBody)) !== null) {
    const modifiers = match[0].match(/(static|readonly|private|protected|public)/g) || [];
    
    properties.push({
      name: match[2],
      isStatic: modifiers.includes('static'),
      isReadonly: modifiers.includes('readonly'),
      visibility: modifiers.includes('private') || match[2].startsWith('#') ? 'private' 
        : modifiers.includes('protected') ? 'protected' 
        : 'public',
      type: match[3]
    });
  }
  
  return [...new Map(properties.map(p => [p.name, p])).values()];
}

/**
 * Extract class inheritance hierarchy
 * 
 * @param {Array} classes - Extracted classes
 * @returns {Object} - Inheritance tree
 */
export function extractInheritanceHierarchy(classes) {
  const hierarchy = {};
  
  classes.forEach(cls => {
    hierarchy[cls.name] = {
      extends: cls.superClass,
      implements: cls.implements || [],
      children: classes.filter(c => c.superClass === cls.name).map(c => c.name),
      depth: 0 // Will be calculated
    };
  });
  
  // Calculate depth for each class
  Object.keys(hierarchy).forEach(name => {
    hierarchy[name].depth = calculateDepth(hierarchy, name);
  });
  
  return hierarchy;
}

/**
 * Extract mixins used by classes
 * 
 * @param {string} code - Source code
 * @returns {Array} - Mixin applications
 */
export function extractMixins(code) {
  const mixins = [];
  
  // Mixin pattern: class X extends Mixin(Y) or class X extends MixinA(MixinB(Base))
  const mixinPattern = /class\s+(\w+)\s+extends\s+(\w+)\s*\(\s*(\w+)\s*\)/g;
  let match;
  
  while ((match = mixinPattern.exec(code)) !== null) {
    mixins.push({
      className: match[1],
      mixin: match[2],
      baseClass: match[3]
    });
  }
  
  return mixins;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractClassBody(code, cls) {
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

function isStaticMethod(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 30), method.start);
  return /\bstatic\b/.test(beforeMethod);
}

function isAbstractMethod(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 30), method.start);
  return /\babstract\b/.test(beforeMethod);
}

function isOverrideMethod(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 30), method.start);
  return /\boverride\b/.test(beforeMethod);
}

function getVisibility(method) {
  if (method.name.startsWith('#')) return 'private';
  if (method.name.startsWith('_')) return 'protected';
  return 'public';
}

function extractImplements(code, cls) {
  const classSignature = code.slice(cls.start, cls.start + 200);
  const implementsMatch = classSignature.match(/implements\s+([^{]+)/);
  
  if (implementsMatch) {
    return implementsMatch[1].split(',').map(i => i.trim());
  }
  
  return [];
}

function extractDecorators(code, cls) {
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

function extractMethodReturnType(classBody, method) {
  const methodStart = classBody.slice(method.start, method.start + 300);
  const returnMatch = methodStart.match(/\)\s*:\s*([^{]+)/);
  return returnMatch ? returnMatch[1].trim() : null;
}

function hasMethodJSDoc(classBody, method) {
  const beforeMethod = classBody.slice(Math.max(0, method.start - 300), method.start);
  return /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeMethod);
}

function extractPropertyType(classBody, startPos) {
  const afterColon = classBody.slice(startPos, startPos + 50);
  const typeMatch = afterColon.match(/^\s*(\w+|[{\[][^;]+[}\]]);/);
  return typeMatch ? typeMatch[1].trim() : null;
}

function calculateClassComplexity(methods) {
  if (!methods.length) return 0;
  
  const totalMethodComplexity = methods.reduce((sum, m) => {
    // Simple complexity estimation
    return sum + (m.parameters?.length || 0) + (m.type === 'getter' ? 1 : 2);
  }, 0);
  
  return Math.round(totalMethodComplexity / methods.length);
}

function calculateInheritanceDepth(classes) {
  let maxDepth = 0;
  
  classes.forEach(cls => {
    let depth = 0;
    let current = cls;
    
    while (current?.superClass) {
      depth++;
      current = classes.find(c => c.name === current.superClass);
    }
    
    maxDepth = Math.max(maxDepth, depth);
  });
  
  return maxDepth;
}

function calculateDepth(hierarchy, className, visited = new Set()) {
  if (visited.has(className)) return 0; // Prevent cycles
  visited.add(className);
  
  const cls = hierarchy[className];
  if (!cls || !cls.extends) return 0;
  
  return 1 + calculateDepth(hierarchy, cls.extends, visited);
}

// ============================================
// EXPORTS
// ============================================

export default {
  extractClasses,
  extractClassMethods,
  extractClassProperties,
  extractInheritanceHierarchy,
  extractMixins
};
