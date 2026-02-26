import { OPERATION_TYPES } from '../operation-types.js';

export function classifyArray(node, code) {
    if (node.type !== 'array') return null;

    return {
        type: OPERATION_TYPES.ARRAY_LITERAL,
        via: 'array_constructor',
        details: { elementCount: node.namedChildCount }
    };
}

export function classifyObject(node, code) {
    if (node.type !== 'object') return null;

    return {
        type: OPERATION_TYPES.OBJECT_LITERAL,
        via: 'object_constructor',
        details: { propertyCount: node.namedChildCount }
    };
}

export function classifySpread(node, code) {
    if (node.type !== 'spread_element') return null;

    return {
        type: OPERATION_TYPES.SPREAD,
        via: 'spread_operator',
        details: {}
    };
}

export function classifyTemplate(node, code) {
    if (node.type !== 'template_string') return null;

    const hasExpressions = node.namedChildren.some(c => c.type === 'template_substitution');
    return {
        type: OPERATION_TYPES.TEMPLATE_LITERAL,
        via: 'template',
        details: { hasExpressions }
    };
}
