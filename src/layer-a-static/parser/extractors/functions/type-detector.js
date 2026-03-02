/**
 * @fileoverview Logic for detecting function types and full names.
 */

import { text, startLine } from '../utils.js';

export function detectTypeAndName(node, code) {
  let functionType = node.type.includes('arrow') ? 'arrow'
    : node.type.includes('method') ? 'method'
      : node.type.includes('class') ? 'class'
        : node.type.includes('generator') ? 'function'
          : 'function';
  let functionName = 'anonymous';
  let className = null;
  const parent = node.parent;

  if (node.type === 'class_declaration' || node.type === 'class') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) functionName = text(nameNode, code);
  } else if (node.type === 'function_declaration' || node.type === 'generator_function_declaration') {
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

  // FIX: Prevent all anonymous/inline functions from sharing the exact same ID
  // which causes SQLite ON CONFLICT to silently overwrite 9,500 valid AST nodes into a single row.
  const isAnonymous = functionName === 'anonymous' || fullName === 'anonymous';
  const finalName = isAnonymous ? `anonymous_${startLine(node)}` : functionName;
  const finalFullName = isAnonymous ? `anonymous_${startLine(node)}` : fullName;

  return { functionName: finalName, functionType, className, fullName: finalFullName };
}
