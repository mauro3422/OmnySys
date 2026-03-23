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

export async function startHotReload(server, logger) {
  const result = initializeHotReload(server, logger, process.env.OMNYSYS_HOT_RELOAD !== 'false');
  if (!result.enabled || !server.hotReloadManager) {
    logger.info('   Continuing without hot-reload...\n');
    return false;
  }

  await server.hotReloadManager.start();
  logger.info('🔥 Hot-reload enabled - System can self-improve');
  logger.info(`   Runtime restart mode: ${server.runtimeRestartMode}`);
  logger.info('   Watching for code changes in src/\n');
  return true;
}

export function initializeRuntimeRestartState(server) {
  server.hotReloadManager = null;
  server.runtimeRestartMode = resolveRuntimeRestartMode(process.env, typeof process.send === 'function');
  server._pendingHotReloadRestartFiles = new Set();
  server._hotReloadRestartScheduled = false;
  server._hotReloadRestartTimer = null;
}
