import {
  buildRuntimeCodeFreshness,
  summarizeWatcherNoise
} from '../../../shared/compiler/index.js';

export function buildServerStatusEnvelope(server, projectPath, phase2InProgress) {
  return {
    initialized: server?.initialized || false,
    initializing: !!server && !server.initialized,
    project: projectPath,
    hotReloadTest: 'v1-success',
    timestamp: new Date().toISOString(),
    telemetryMode: phase2InProgress ? 'fast_phase2' : 'full'
  };
}

export function buildNodeVitals(server) {
  return {
    uptime: Math.round((Date.now() - server.startTime) / 1000),
    memory: process.memoryUsage(),
    activeHandles: (typeof process._getActiveHandles === 'function')
      ? process._getActiveHandles().length
      : 'N/A'
  };
}

export function attachOrchestratorStatus(status, orchestrator) {
  if (orchestrator) {
    try {
      status.orchestrator = orchestrator.getStatus ? orchestrator.getStatus() : { status: 'initializing' };
    } catch (error) {
      status.orchestrator = { status: 'error', message: error.message };
    }
    return;
  }

  status.orchestrator = { status: 'not_ready', message: 'Orchestrator is initializing' };
}

export function buildRuntimeHotReloadStatus(server) {
  return server?.hotReloadManager?.getStats?.() || {
    isWatching: false,
    isReloading: false,
    runtimeRestartMode: server?.runtimeRestartMode || 'manual',
    pendingRuntimeRestart: {
      scheduled: !!server?._hotReloadRestartScheduled,
      files: Array.from(server?._pendingHotReloadRestartFiles || [])
    }
  };
}

export function attachRuntimeHotReload(status, server) {
  status.hotReload = buildRuntimeHotReloadStatus(server);
  status.hotReload.watcherNoise = summarizeWatcherNoise(status.hotReload.watcherNoise);
  status.runtimeCodeFreshness = buildRuntimeCodeFreshness({
    runtimeRestartMode: status.hotReload.runtimeRestartMode,
    pendingRuntimeRestartFiles: status.hotReload.pendingRuntimeRestart?.files || []
  });
}

export function attachCacheStatus(status, cache) {
  if (cache) {
    try {
      status.cache = cache.getStats ? cache.getStats() : { status: 'initializing' };
    } catch (error) {
      status.cache = { status: 'error', message: error.message };
    }
    return;
  }

  status.cache = { status: 'not_ready', message: 'Cache is initializing' };
}
