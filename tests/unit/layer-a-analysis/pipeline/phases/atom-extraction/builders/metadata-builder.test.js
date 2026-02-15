import { describe, it, expect } from 'vitest';
import { buildAtomMetadata } from '#layer-a/pipeline/phases/atom-extraction/builders/metadata-builder.js';

describe('pipeline/phases/atom-extraction/builders/metadata-builder.js', () => {
  it('builds full atom metadata shape from extraction payload', () => {
    const metadata = buildAtomMetadata({
      functionInfo: {
        id: 'atom-1',
        name: 'compute',
        line: 10,
        endLine: 30,
        isExported: true,
        type: 'declaration',
        calls: [{ name: 'helper' }]
      },
      filePath: 'src/compute.js',
      linesOfCode: 21,
      complexity: 4,
      sideEffects: {
        all: [{ type: 'console' }],
        networkCalls: [{ endpoint: '/api' }],
        domManipulations: [],
        storageAccess: [],
        consoleUsage: [{ call: 'console.log' }]
      },
      callGraph: {
        internalCalls: [{ name: 'helper' }],
        externalCalls: [{ name: 'fetch' }]
      },
      temporal: { lifecycleHooks: [], cleanupPatterns: [] },
      temporalPatterns: [],
      typeContracts: { input: [], output: [] },
      errorFlow: { catches: [] },
      performanceHints: { nestedLoops: [], blockingOperations: [] },
      performanceMetrics: { score: 80 },
      dataFlowV2: {
        real: { inputs: [{ name: 'x' }], outputs: [{ type: 'return' }] },
        analysis: { coherence: 90 }
      },
      functionCode: 'export function compute(x) { return x; }'
    });

    expect(metadata.id).toBe('atom-1');
    expect(metadata.name).toBe('compute');
    expect(metadata.filePath).toBe('src/compute.js');
    expect(metadata.hasNetworkCalls).toBe(true);
    expect(metadata.hasDataFlow).toBe(true);
    expect(metadata.networkEndpoints).toContain('/api');
    expect(metadata._meta.confidence).toBe(0.9);
  });

  it('handles null data-flow and defaults confidence', () => {
    const metadata = buildAtomMetadata({
      functionInfo: { id: 'a2', name: 'noop', line: 1, endLine: 1, isExported: false, calls: [] },
      filePath: 'src/noop.js',
      linesOfCode: 1,
      complexity: 1,
      sideEffects: { all: [], networkCalls: [], domManipulations: [], storageAccess: [], consoleUsage: [] },
      callGraph: { internalCalls: [], externalCalls: [] },
      temporal: { lifecycleHooks: [], cleanupPatterns: [] },
      temporalPatterns: [],
      typeContracts: {},
      errorFlow: {},
      performanceHints: { nestedLoops: [], blockingOperations: [] },
      performanceMetrics: {},
      dataFlowV2: null,
      functionCode: 'function noop(){}'
    });

    expect(metadata.hasDataFlow).toBe(false);
    expect(metadata._meta.confidence).toBe(0.5);
  });
});

