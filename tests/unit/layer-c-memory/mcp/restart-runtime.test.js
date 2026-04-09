import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildRestartLifecycleGuidance: vi.fn((payload) => ({
    ...payload,
    summary: `${payload.restartType || 'restart'} lifecycle`,
    recommendedActions: []
  })),
  clearPendingRuntimeRestart: vi.fn(),
  invalidateIncrementalState: vi.fn(),
  reloadServerMetadata: vi.fn(),
  refreshRegistry: vi.fn(),
  fastRestartOrchestrator: vi.fn(),
  handleClearCacheOnly: vi.fn(),
  handleRefreshOnly: vi.fn(),
  clearStandaloneCache: vi.fn(),
  purgeRuntimeCache: vi.fn(),
  performSoftReload: vi.fn(),
  refreshToolRegistrySafely: vi.fn(),
  runFullPipeline: vi.fn(),
  stopOrchestrator: vi.fn(),
  buildProxyRestartResult: vi.fn(() => ({ success: true, restarting: true })),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../../../src/shared/compiler/index.js', () => ({
  buildRestartLifecycleGuidance: mocks.buildRestartLifecycleGuidance
}));

vi.mock('../../../../src/layer-c-memory/mcp/core/hot-reload-manager/restart-coordinator.js', () => ({
  clearPendingRuntimeRestart: mocks.clearPendingRuntimeRestart
}));

vi.mock('../../../../src/layer-c-memory/mcp/restart-runtime-helpers.js', () => ({
  buildProxyRestartResult: mocks.buildProxyRestartResult,
  buildProcessRestartWarningMessage: vi.fn(),
  clearStandaloneCache: mocks.clearStandaloneCache,
  fastRestartOrchestrator: mocks.fastRestartOrchestrator,
  invalidateIncrementalState: mocks.invalidateIncrementalState,
  handleClearCacheOnly: mocks.handleClearCacheOnly,
  handleRefreshOnly: mocks.handleRefreshOnly,
  performSoftReload: mocks.performSoftReload,
  purgeRuntimeCache: mocks.purgeRuntimeCache,
  refreshRegistry: mocks.refreshRegistry,
  refreshToolRegistrySafely: mocks.refreshToolRegistrySafely,
  reloadServerMetadata: mocks.reloadServerMetadata,
  runFullPipeline: mocks.runFullPipeline,
  stopOrchestrator: mocks.stopOrchestrator
}));

vi.mock('../../../../src/layer-c-memory/mcp/core/initialization/steps/index.js', () => ({
  LayerAAnalysisStep: class {
    async execute() {
      return undefined;
    }
  }
}));

vi.mock('../../../../src/layer-c-memory/utils/logger.js', () => ({
  createLogger: () => mocks.logger
}));

import { handleRuntimeRestart } from '../../../../src/layer-c-memory/mcp/restart-runtime.js';
import { handleProcessRestart } from '../../../../src/layer-c-memory/mcp/restart-runtime-process.js';

describe('restart-runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reindexes without throwing when reindexOnly is requested', async () => {
    const server = {
      projectPath: 'C:/Dev/OmnySystem',
      cache: {
        initialize: vi.fn(async () => undefined),
        set: vi.fn()
      },
      metadata: { ready: true },
      wsManager: {},
      orchestrator: {
        _phase2IndexerInstance: { stop: vi.fn() },
        _startPhase2BackgroundIndexer: vi.fn(async () => undefined),
        totalPhase2Files: 99
      },
      _layerAComplete: true
    };

    const result = await handleRuntimeRestart({ reindexOnly: true }, { server, cache: server.cache });

    expect(result.success).toBe(true);
    expect(result.reindexed).toBe(true);
    expect(mocks.reloadServerMetadata).toHaveBeenCalledTimes(1);
    expect(server.cache.initialize).toHaveBeenCalledTimes(1);
    expect(server.orchestrator._startPhase2BackgroundIndexer).toHaveBeenCalledTimes(1);
    expect(mocks.logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('ReindexOnly failed'));
  });

  it('returns a true process restart ack in proxy mode', async () => {
    const originalProcessSend = process.send;
    process.send = vi.fn();

    try {
      const result = await handleProcessRestart({
        clearCache: false,
        reanalyze: false,
        reindexOnly: false,
        cache: null,
        refreshToolRegistryFn: vi.fn(),
        proxyMode: true
      });

      expect(result.success).toBe(true);
      expect(result.restarting).toBe(true);
      expect(result.restartType).toBe('true_process_restart');
      expect(process.send).toHaveBeenCalledWith(expect.objectContaining({ processRestart: true }));
    } finally {
      process.send = originalProcessSend;
    }
  });
});
