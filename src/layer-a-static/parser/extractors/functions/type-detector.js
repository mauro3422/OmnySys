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
      // const myFn = () => {}
      const nameNode = parent.childForFieldName('name');
      if (nameNode) functionName = text(nameNode, code);
    } else if (parent?.type === 'assignment_expression') {
      // obj.prop = () => {}  →  derive from left-hand side
      const left = parent.childForFieldName('left');
      if (left) {
        const leftText = text(left, code);
        // Use last segment: obj.prop → prop
        functionName = leftText.split('.').pop().replace(/[^a-zA-Z0-9_$]/g, '') || 'anonymous';
      }
    } else if (parent?.type === 'pair') {
      // { myMethod: () => {} }  →  use key
      const keyNode = parent.childForFieldName('key');
      if (keyNode) functionName = text(keyNode, code).replace(/['"]/g, '');
    } else if (parent?.type === 'shorthand_property_identifier_pattern' || parent?.type === 'method_definition') {
      const nameNode = parent.childForFieldName('name');
      if (nameNode) functionName = text(nameNode, code);
    } else if (parent?.type === 'arguments' || parent?.type === 'argument_list') {
      // Callback passed as argument: arr.map(x => {})  →  callerMethod_callback
      const callExpr = parent.parent;
      if (callExpr?.type === 'call_expression') {
        const fn = callExpr.childForFieldName('function');
        if (fn) {
          // Get the method name: arr.map → map, Promise.all → all
          const fnText = text(fn, code);
          const methodPart = fnText.split('.').pop().replace(/[^a-zA-Z0-9_$]/g, '');
          if (methodPart && methodPart !== 'anonymous') {
            // Find position of this argument
            const argIndex = parent.children.filter(c => c.type !== ',' && c.type !== '(' && c.type !== ')').indexOf(node);
            functionName = argIndex <= 0 ? `${methodPart}_callback` : `${methodPart}_arg${argIndex}`;
          }
        }
      }
    } else if (parent?.type === 'return_statement') {
      // return () => {}  →  annotate with parent scope name if possible
      let p = parent.parent;
      while (p) {
        if (p.type === 'function_declaration' || p.type === 'method_definition') {
          const nameNode = p.childForFieldName('name');
          if (nameNode) { functionName = `${text(nameNode, code)}_return`; break; }
        }
        p = p.parent;
      }
    }
  }

  const fullName = className ? `${className}.${functionName}` : functionName;

  // Prevent all anonymous/inline functions from sharing the exact same ID
  const isAnonymous = functionName === 'anonymous' || fullName === 'anonymous';
  const finalName = isAnonymous ? `anonymous_${startLine(node)}` : functionName;
  const finalFullName = isAnonymous ? `anonymous_${startLine(node)}` : fullName;

  return { functionName: finalName, functionType, className, fullName: finalFullName };
}

