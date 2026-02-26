/**
 * @fileoverview Logic for tracking identifier references within functions.
 */

import { walk, text } from '../utils.js';

export function trackReferences(node, code) {
  const identifierRefs = [];
  const seenRefs = new Set();
  
  walk(node, ['identifier'], (idNode) => {
    const idParent = idNode.parent;
    if (!idParent) return;
    
    const isDef = ['variable_declarator', 'function_declaration', 'parameter', 'method_definition'].includes(idParent.type);
    const isProp = idParent.type === 'member_expression' && idParent.childForFieldName('property') === idNode;
    
    if (!isDef && !isProp) {
      const idName = text(idNode, code);
      if (idName !== 'undefined' && idName !== 'null' && idName !== 'console' && !seenRefs.has(idName)) {
        seenRefs.add(idName);
        identifierRefs.push(idName);
      }
    }
  });

  return identifierRefs;
}
