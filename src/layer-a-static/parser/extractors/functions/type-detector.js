/**
 * @fileoverview Logic for detecting function types and full names.
 */

import { text } from '../utils.js';

export function detectTypeAndName(node, code) {
  let functionName = 'anonymous';
  let functionType = node.type.includes('arrow') ? 'arrow'
    : node.type.includes('method') ? 'method'
      : node.type.includes('generator') ? 'function'
        : 'function';
  let className = null;

  const parent = node.parent;

  if (node.type === 'function_declaration' || node.type === 'generator_function_declaration') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) functionName = text(nameNode, code);
  } else if (node.type === 'method_definition') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) functionName = text(nameNode, code);
    let p = node.parent;
    while (p) {
      if (p.type === 'class_declaration' || p.type === 'class') {
        const cn = p.childForFieldName('name');
        if (cn) className = text(cn, code);
        break;
      }
      p = p.parent;
    }
  } else if (node.type === 'arrow_function' || node.type === 'function_expression') {
    if (parent?.type === 'variable_declarator') {
      const nameNode = parent.childForFieldName('name');
      if (nameNode) functionName = text(nameNode, code);
    }
  }

  const fullName = className ? `${className}.${functionName}` : functionName;

  return { functionName, functionType, className, fullName };
}
