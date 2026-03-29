import { HotReloadManager } from './hot-reload-manager/index.js';

export function resolveRuntimeRestartMode(env, hasProcessSend) {
  const runtimeRestartModeEnv = String(env.OMNYSYS_RUNTIME_RESTART_MODE || '').toLowerCase();
  return runtimeRestartModeEnv === 'manual'
    ? 'manual'
    : runtimeRestartModeEnv === 'auto'
      ? 'auto'
      : (hasProcessSend ? 'auto' : 'manual');
}

export function initializeHotReload(server, logger, hotReloadEnabled = true) {
  if (!hotReloadEnabled) {
    return { enabled: false };
  }

  try {
    server.hotReloadManager = new HotReloadManager(server);
    return { enabled: true, manager: server.hotReloadManager };
  } catch (error) {
    logger.warn('⚠️  Hot-reload failed to start:', error.message);
    return { enabled: false, error };
  }
}

export function initializeRuntimeRestartState(server) {
  server.hotReloadManager = null;
  const hasProcessSend = typeof process.send === 'function';
  server.runtimeRestartMode = resolveRuntimeRestartMode(process.env, hasProcessSend);
  server.proxyManaged = server.runtimeRestartMode === 'auto' && hasProcessSend;
  server._pendingHotReloadRestartFiles = new Set();
  server._hotReloadRestartScheduled = false;
  server._hotReloadRestartTimer = null;
  server._pendingHotReloadChanges = new Map();
  server._hotReloadDeferredDrainTimer = null;
}
