import { describe, it, expect } from 'vitest';
import {
  extractErrorFlowConnections,
  extractErrorFlow,
  extractThrows,
  extractCatches,
  extractTryBlocks,
  detectPropagationPattern,
  detectUnhandledCalls
} from '#layer-a/extractors/metadata/error-flow/index.js';

describe('extractors/metadata/error-flow/index.js', () => {
  it('exports modular error-flow API', () => {
    expect(extractErrorFlow).toBeTypeOf('function');
    expect(extractThrows).toBeTypeOf('function');
    expect(extractCatches).toBeTypeOf('function');
    expect(extractTryBlocks).toBeTypeOf('function');
    expect(detectPropagationPattern).toBeTypeOf('function');
    expect(detectUnhandledCalls).toBeTypeOf('function');
  });

  it('builds coarse error flow connections between throwers and catchers', () => {
    const connections = extractErrorFlowConnections([
      { id: 'a1', errorFlow: { throws: [{ type: 'Error' }] } },
      { id: 'a2', errorFlow: { catches: [{ type: 'Error' }] } }
    ]);
    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({
      type: 'error-flow',
      from: 'a1',
      to: 'a2'
    });
  });
});

