import { describe, expect, it } from 'vitest';

import { RuntimeChangeAction, classifyRuntimeChange } from '../../../../src/layer-c-memory/mcp/core/hot-reload-manager/policy/runtime-change-policy.js';

describe('runtime-change-policy', () => {
  it('ignores non-runtime surfaces like docs and tests', () => {
    const docs = classifyRuntimeChange('docs/04-maintenance/daemon-restart-policy.md', null);
    const tests = classifyRuntimeChange('tests/unit/some-feature.test.js', null);

    expect(docs.action).toBe(RuntimeChangeAction.IGNORE);
    expect(tests.action).toBe(RuntimeChangeAction.IGNORE);
  });

  it('requests restart for critical runtime surfaces', () => {
    const result = classifyRuntimeChange('src/layer-c-memory/mcp-http-server.js', {
      type: 'critical',
      priority: 0
    });

    expect(result.action).toBe(RuntimeChangeAction.RESTART);
    expect(result.restartRequired).toBe(true);
  });

  it('requests reindex for analysis and storage surfaces', () => {
    const analysis = classifyRuntimeChange('src/layer-a-static/pipeline/core-analyzer.js', {
      type: 'handler',
      priority: 1
    });
    const storage = classifyRuntimeChange('src/layer-c-memory/storage/repository/atom-repository.js', {
      type: 'tool',
      priority: 1
    });

    expect(analysis.action).toBe(RuntimeChangeAction.REINDEX);
    expect(analysis.reindexRequired).toBe(true);
    expect(storage.action).toBe(RuntimeChangeAction.REINDEX);
  });

  it('requests refresh for cache and metadata surfaces', () => {
    const cache = classifyRuntimeChange('src/shared/atomic-cache.js', {
      type: 'handler',
      priority: 1
    });
    const storage = classifyRuntimeChange('src/layer-c-memory/storage/database/connection.js', {
      type: 'handler',
      priority: 1
    });

    expect(cache.action).toBe(RuntimeChangeAction.REFRESH);
    expect(cache.refreshRequired).toBe(true);
    expect(storage.action).toBe(RuntimeChangeAction.REFRESH);
    expect(storage.refreshRequired).toBe(true);
  });

  it('keeps reloadable runtime modules on the reload path', () => {
    const result = classifyRuntimeChange('src/core/error-guardian/guardian/index.js', {
      type: 'handler',
      priority: 2
    });

    expect(result.action).toBe(RuntimeChangeAction.RELOAD);
    expect(result.reloadRequired).toBe(true);
  });
});
