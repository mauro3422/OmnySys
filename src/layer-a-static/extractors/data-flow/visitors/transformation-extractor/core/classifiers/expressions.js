import { getMemberPath } from '../../../../utils/ts-ast-utils.js';
import { OPERATION_TYPES } from '../operation-types.js';

export function classifyBinary(node, code) {
    if (node.type !== 'binary_expression' && node.type !== 'logical_expression') {
        return null;
    }

    const operator = node.children.find(c => !c.isNamed && !['(', ')'].includes(c.type))?.type || 'unknown';

    return {
        type: OPERATION_TYPES.BINARY_OPERATION,
        via: operator,
        details: { operator }
    };
}

export function classifyUnary(node, code) {
    if (node.type !== 'unary_expression') return null;

    const operator = node.children.find(c => !c.isNamed)?.type || 'unknown';

    return {
        type: OPERATION_TYPES.UNARY_OPERATION,
        via: operator,
        details: { operator }
    };
}

export function classifyUpdate(node, code) {
    if (node.type !== 'update_expression') return null;

    const operator = node.children.find(c => c.type === '++' || c.type === '--')?.type || 'update';

    return {
        type: OPERATION_TYPES.UPDATE,
        via: operator,
        details: { operator }
    };
}

export function classifyMember(node, code) {
    if (node.type !== 'member_expression') return null;

    const path = getMemberPath(node, code);
    return {
        type: OPERATION_TYPES.PROPERTY_ACCESS,
        via: 'property_access',
        details: { path }
    };
}

export function classifyConditional(node, code) {
    if (node.type !== 'ternary_expression') return null;

    return {
        type: OPERATION_TYPES.CONDITIONAL,
        via: 'ternary',
        details: {}
    };
}
