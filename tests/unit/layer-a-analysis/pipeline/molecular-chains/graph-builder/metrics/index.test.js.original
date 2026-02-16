import { describe, it, expect } from 'vitest';
import { calculateMetrics, calculateCentrality } from '#layer-a/pipeline/molecular-chains/graph-builder/metrics/index.js';

describe('pipeline/molecular-chains/graph-builder/metrics/index.js', () => {
  it('exports metrics helpers', () => {
    expect(calculateMetrics).toBeTypeOf('function');
    expect(calculateCentrality).toBeTypeOf('function');
  });

  it('calculates graph metrics contract', () => {
    const nodes = [{ id: 'a', function: 'fa' }, { id: 'b', function: 'fb' }];
    const edges = [{ from: 'a', to: 'b' }];
    const metrics = calculateMetrics(nodes, edges);
    const centrality = calculateCentrality(nodes, edges);
    expect(metrics.totalNodes).toBe(2);
    expect(metrics.totalEdges).toBe(1);
    expect(centrality.get('a')).toBe(1);
  });
});
