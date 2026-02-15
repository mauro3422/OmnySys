import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  calculateCentrality
} from '#layer-a/pipeline/molecular-chains/graph-builder/metrics/calculator.js';

describe('pipeline/molecular-chains/graph-builder/metrics/calculator.js', () => {
  const nodes = [
    { id: 'n1', function: 'a' },
    { id: 'n2', function: 'b' },
    { id: 'n3', function: 'c' }
  ];
  const edges = [
    { from: 'n1', to: 'n2' },
    { from: 'n2', to: 'n3' },
    { from: 'n1', to: 'n3' }
  ];

  it('calculates node centrality from incoming/outgoing edges', () => {
    const centrality = calculateCentrality(nodes, edges);
    expect(centrality.get('n1')).toBe(2);
    expect(centrality.get('n2')).toBe(2);
    expect(centrality.get('n3')).toBe(2);
  });

  it('calculates graph metrics summary', () => {
    const metrics = calculateMetrics(nodes, edges);
    expect(metrics.totalNodes).toBe(3);
    expect(metrics.totalEdges).toBe(3);
    expect(metrics.avgConnectivity).toBe(1);
    expect(metrics.mostCentralNodes.length).toBeLessThanOrEqual(5);
    expect(metrics).toHaveProperty('isolatedNodes');
  });
});

