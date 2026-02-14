/**
 * @fileoverview class-body.js
 * 
 * Class body parsing utilities
 * 
 * @module comprehensive-extractor/extractors/class-extractor/parsers/class-body
 */

import { findMethods } from '../../parsers/ast-parser.js';
import { 
  isStaticMethod, 
  isAbstractMethod, 
  isOverrideMethod, 
  getVisibility,
  extractMethodParameters,
  extractMethodReturnType,
  hasMethodJSDoc
} from '../utils/method-helpers.js';

/**
 * Extract class body content
 * 
 * @param {string} code - Source code
 * @param {Object} cls - Class info
 * @returns {string} - Class body
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

function extractPropertyType(classBody, startPos) {
  const afterColon = classBody.slice(startPos, startPos + 50);
  const typeMatch = afterColon.match(/^\s*(\w+|[{\[][^;]+[}\]]);/);
  return typeMatch ? typeMatch[1].trim() : null;
}
