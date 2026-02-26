import { getMemberPath, text } from '../../../../utils/ts-ast-utils.js';
import { OPERATION_TYPES } from '../types.js';

function getCalleeName(node, code) {
  if (!node) return '<anonymous>';
  return getMemberPath(node, code) || text(node, code) || '<anonymous>';
}

export function classifyCall(node, code) {
  if (node.type !== 'call_expression') return null;

  const calleeNode = node.childForFieldName('function');
  const argumentsNode = node.childForFieldName('arguments');

  const calleeName = getCalleeName(calleeNode, code);
  return {
    type: OPERATION_TYPES.FUNCTION_CALL,
    via: calleeName,
    details: { argumentCount: argumentsNode ? argumentsNode.namedChildCount : 0 }
  };
}

export function classifyNew(node, code) {
  if (node.type !== 'new_expression') return null;

  const constructorNode = node.childForFieldName('constructor');
  const calleeName = getCalleeName(constructorNode, code);
  return {
    type: OPERATION_TYPES.INSTANTIATION,
    via: calleeName,
    details: { className: calleeName }
  };
}
