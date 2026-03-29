import { describe, expect, it } from 'vitest';
import { ReloadHandler } from '../../../../src/layer-c-memory/mcp/core/hot-reload-manager/handlers/reload-handler.js';

describe('ReloadHandler', () => {
  it('does not crash when hot-reload events cannot be emitted', () => {
    const handler = new ReloadHandler({
      projectPath: 'C:\\Dev\\OmnySystem',
      cache: null,
      orchestrator: null
    });

    expect(() => handler._handleError('src/core/example.js', new Error('boom'))).not.toThrow();
    expect(() => handler._emitSuccess('src/core/example.js', null, 12)).not.toThrow();
  });
});
