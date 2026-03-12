export function toVisualFormat(nodes, edges, entryPoints, exitPoints) {
  const lines = [];
  lines.push('Data Flow Graph:');
  lines.push('================');
  lines.push(`\nEntry Points: ${entryPoints.map(node => node.id).join(', ')}`);
  lines.push('\nNodes:');

  for (const [id, node] of nodes) {
    const inputs = (node.inputs || []).map(input => input.name || input.value || '?').join(', ');
    const output = node.output?.name || 'void';
    lines.push(`  ${id}: ${inputs} â†’ [${node.type}] â†’ ${output}`);
  }

  lines.push('\nEdges:');
  for (const edge of edges) {
    lines.push(`  ${edge.from} â†’ ${edge.to}`);
  }

  lines.push(`\nExit Points: ${exitPoints.map(node => node.id).join(', ')}`);
  return lines.join('\n');
}
