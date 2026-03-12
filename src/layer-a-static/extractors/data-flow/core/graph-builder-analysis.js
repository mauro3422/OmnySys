export function buildGraphMetadata(nodes, edges, getIncomingEdges, getOutgoingEdges) {
  const entryPoints = findEntryPoints(nodes, getIncomingEdges);
  const exitPoints = findExitPoints(nodes, getOutgoingEdges);

  return {
    totalNodes: nodes.size,
    totalEdges: edges.length,
    entryPoints: entryPoints.map(node => node.id),
    exitPoints: exitPoints.map(node => node.id),
    hasSideEffects: hasSideEffects(nodes),
    hasAsync: hasAsync(nodes),
    complexity: calculateComplexity(nodes)
  };
}

export function findEntryPoints(nodes, getIncomingEdges) {
  return Array.from(nodes.values()).filter(node =>
    node.type === 'INPUT' || getIncomingEdges(node.id).length === 0
  );
}

export function findExitPoints(nodes, getOutgoingEdges) {
  return Array.from(nodes.values()).filter(node =>
    node.type === 'RETURN' ||
    node.type === 'SIDE_EFFECT' ||
    getOutgoingEdges(node.id).length === 0
  );
}

export function hasSideEffects(nodes) {
  return Array.from(nodes.values()).some(node =>
    node.category === 'side_effect' || node.properties?.hasSideEffects
  );
}

export function hasAsync(nodes) {
  return Array.from(nodes.values()).some(node =>
    node.properties?.isAsync || node.properties?.await
  );
}

export function calculateComplexity(nodes) {
  let complexity = 0;

  complexity += Array.from(nodes.values()).filter(node =>
    node.category !== 'input' && node.category !== 'constant'
  ).length;

  complexity += hasSideEffects(nodes) ? 2 : 0;

  complexity += Array.from(nodes.values()).filter(node =>
    node.type === 'CONDITIONAL'
  ).length;

  return complexity;
}

export function tracePath(nodes, getOutgoingEdges, nodeId, visited = new Set()) {
  if (visited.has(nodeId)) {
    return [];
  }

  visited.add(nodeId);

  const node = nodes.get(nodeId);
  if (!node) {
    return [];
  }

  const outgoingEdges = getOutgoingEdges(nodeId);
  if (outgoingEdges.length === 0) {
    return [{ node, isExit: true }];
  }

  const paths = [];
  for (const edge of outgoingEdges) {
    paths.push({
      node,
      edge,
      next: tracePath(nodes, getOutgoingEdges, edge.to, new Set(visited))
    });
  }

  return paths;
}

export function findDependentTransforms(scope, getOutgoingEdges, nodes, variableName) {
  const startNodeId = scope.get(variableName);
  if (!startNodeId) {
    return [];
  }

  const dependentNodes = new Set();
  const queue = [startNodeId];
  const visited = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    for (const edge of getOutgoingEdges(currentId)) {
      dependentNodes.add(edge.to);
      queue.push(edge.to);
    }
  }

  return Array.from(dependentNodes).map(nodeId => nodes.get(nodeId));
}
