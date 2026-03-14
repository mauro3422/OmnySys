/**
 * @fileoverview Logic for detecting function types and full names.
 * Complexity has been split from C=51 to ~C=12 per helper.
 */

import { text, startLine } from '../utils.js';
import { extractClassName as extractClassNameHelper } from '../../../extractors/utils/class-name-extractor.js';

// ─── Helpers por tipo de nodo ────────────────────────────────────────────────

/** Detecta el tipo de función a partir del tipo del nodo Tree-sitter */
function detectFunctionType(nodeType) {
  if (nodeType.includes('arrow')) return 'arrow';
  if (nodeType.includes('method')) return 'method';
  if (nodeType.includes('class')) return 'class';
  return 'function';
}

/** Extrae el nombre de una class_declaration o class */
function extractClassName(node, code) {
  return extractClassNameHelper(node, code);
}

/** Extrae el nombre de una function_declaration o generator */
function extractFunctionDeclarationName(node, code) {
  const nameNode = node.childForFieldName('name');
  return nameNode ? text(nameNode, code) : 'anonymous';
}

/** Extrae nombre y clase de una method_definition */
function extractMethodName(node, code) {
  const nameNode = node.childForFieldName('name');
  const functionName = nameNode ? text(nameNode, code) : 'anonymous';

  let className = null;
  let p = node.parent;
  while (p) {
    if (p.type === 'class_declaration' || p.type === 'class') {
      const cn = p.childForFieldName('name');
      if (cn) className = text(cn, code);
      break;
    }
    p = p.parent;
  }
  return { functionName, className };
}

/** Extrae nombre de una arrow_function o function_expression según su contexto padre */
function extractArrowOrExpressionName(node, code) {
  const parent = node.parent;

  if (parent?.type === 'variable_declarator') {
    const nameNode = parent.childForFieldName('name');
    if (nameNode) return text(nameNode, code);
  }

  if (parent?.type === 'assignment_expression') {
    const left = parent.childForFieldName('left');
    if (left) return text(left, code).split('.').pop().replace(/[^a-zA-Z0-9_$]/g, '') || 'anonymous';
  }

  if (parent?.type === 'pair') {
    const keyNode = parent.childForFieldName('key');
    if (keyNode) return text(keyNode, code).replace(/['"]/g, '');
  }

  if (parent?.type === 'shorthand_property_identifier_pattern' || parent?.type === 'method_definition') {
    const nameNode = parent.childForFieldName('name');
    if (nameNode) return text(nameNode, code);
  }

  if (parent?.type === 'arguments' || parent?.type === 'argument_list') {
    return extractCallbackName(node, parent, code);
  }

  if (parent?.type === 'return_statement') {
    return extractReturnedFunctionName(parent, code);
  }

  return 'anonymous';
}

/** Extrae el nombre de un callback pasado como argumento */
function extractCallbackName(node, parent, code) {
  const callExpr = parent.parent;
  if (callExpr?.type !== 'call_expression') return 'anonymous';

  const fn = callExpr.childForFieldName('function');
  if (!fn) return 'anonymous';

  const methodPart = text(fn, code).split('.').pop().replace(/[^a-zA-Z0-9_$]/g, '');
  if (!methodPart || methodPart === 'anonymous') return 'anonymous';

  const argIndex = parent.children
    .filter(c => c.type !== ',' && c.type !== '(' && c.type !== ')')
    .indexOf(node);

  return argIndex <= 0 ? `${methodPart}_callback` : `${methodPart}_arg${argIndex}`;
}

/** Retorna el nombre del scope que retorna la función */
function extractReturnedFunctionName(returnStatement, code) {
  let p = returnStatement.parent;
  while (p) {
    if (p.type === 'function_declaration' || p.type === 'method_definition') {
      const nameNode = p.childForFieldName('name');
      if (nameNode) return `${text(nameNode, code)}_return`;
    }
    p = p.parent;
  }
  return 'anonymous';
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Detecta tipo y nombre de un nodo de función en el AST.
 * Complejidad reducida de C=51 a ~C=12.
 * @param {Object} node - Nodo tree-sitter
 * @param {string} code - Código fuente
 * @returns {{ functionName, functionType, className, fullName }}
 */
export function detectTypeAndName(node, code) {
  const functionType = detectFunctionType(node.type);
  let functionName = 'anonymous';
  let className = null;

  if (node.type === 'class_declaration' || node.type === 'class') {
    functionName = extractClassName(node, code);
  } else if (node.type === 'function_declaration' || node.type === 'generator_function_declaration') {
    functionName = extractFunctionDeclarationName(node, code);
  } else if (node.type === 'method_definition') {
    ({ functionName, className } = extractMethodName(node, code));
  } else if (node.type === 'arrow_function' || node.type === 'function_expression') {
    functionName = extractArrowOrExpressionName(node, code);
  }

  const fullName = className ? `${className}.${functionName}` : functionName;
  const isAnonymous = functionName === 'anonymous';
  const finalName = isAnonymous ? `anonymous_${startLine(node)}` : functionName;
  const finalFullName = isAnonymous ? `anonymous_${startLine(node)}` : fullName;

  return { functionName: finalName, functionType, className, fullName: finalFullName };
}
