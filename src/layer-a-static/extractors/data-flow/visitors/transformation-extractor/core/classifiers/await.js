export function classifyAwait(node, code, classifyOperation) {
    if (node.type !== 'await_expression') return null;

    const argument = node.namedChildren[0];
    const inner = classifyOperation(argument, code);
    return {
        ...inner,
        type: `await_${inner.type}`,
        details: { ...inner.details, isAsync: true }
    };
}
