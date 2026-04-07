/**
 * @fileoverview Hot reload restart coordinator
 *
 * Centralizes restart queueing so runtime-facing changes can either stay
 * pending in manual mode or request a proxy-managed worker restart in auto
 * mode without duplicating timer logic across strategies.
 *
 * @module hot-reload-manager/restart-coordinator
 */

import { createLogger } from '../../../../utils/logger.js';
import { buildRestartLifecycleGuidance } from '../../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:hot-reload:restart');
const DEFAULT_RESTART_DEBOUNCE_MS = 900;

// Cooldown after a processRestart to prevent restart loops.
// When the worker respawns with fresh ESM cache, the file watcher may detect
// residual changes. This cooldown prevents those from triggering another restart.
const RESTART_COOLDOWN_MS = 60000; // 60 seconds
let _lastRestartAt = 0;

function ensureRestartState(server) {
  if (!server._pendingHotReloadRestartFiles) {
    server._pendingHotReloadRestartFiles = new Set();
  }
  return server._pendingHotReloadRestartFiles;
}

function isProxyManaged(server) {
  return server?.proxyManaged === true;
}

function getRuntimeRestartMode(server) {
  return server?.runtimeRestartMode === 'auto' ? 'auto' : 'manual';
}

function buildRestartFiles(server) {
  return Array.from(server._pendingHotReloadRestartFiles || []);
}

function emitRestartNotice(server, eventName, file, files, reason) {
  if (typeof server?.emit !== 'function') {
    return;
  }

  try {
    server.emit(eventName, {
      file,
      files,
      reason
    });
  } catch (error) {
    logger.debug(`Failed to emit ${eventName}: ${error.message}`);
  }
}

function requestProxyManagedRestart(server, filename, reason, eventName) {
  // COOLDOWN CHECK: Prevent restart loops after processRestart.
  // When the worker respawns with fresh ESM cache, the file watcher may
  // detect residual changes. We suppress restarts for 60s after the last one.
  const now = Date.now();
  const timeSinceLastRestart = now - _lastRestartAt;
  if (_lastRestartAt > 0 && timeSinceLastRestart < RESTART_COOLDOWN_MS) {
    logger.warn(
      `⏳ Restart suppressed (cooldown: ${Math.round((RESTART_COOLDOWN_MS - timeSinceLastRestart) / 1000)}s remaining). ` +
      `File: ${filename}. Reason: ${reason}`
    );
    return false;
  }

  if (server._hotReloadRestartTimer) {
    clearTimeout(server._hotReloadRestartTimer);
  }

  if (server._hotReloadRestartScheduled) {
    logger.debug(`Worker restart already scheduled: ${filename}`);
    return true;
  }

  server._hotReloadRestartTimer = setTimeout(() => {
    const touchedFiles = buildRestartFiles(server);
    clearPendingRuntimeRestart(server);
    const lifecycle = buildRestartLifecycleGuidance({
      restartType: 'hot_reload_runtime_restart',
      proxyMode: true
    });

    logger.warn(
      `${reason || 'Runtime module'} changed - requesting worker restart for fresh runtime cache: ${touchedFiles.join(', ')}`
    );

    // Record restart time for cooldown
    _lastRestartAt = Date.now();

    process.send?.({
      type: 'restart',
      clearCache: false,
      reanalyze: false,
      clearCacheOnly: false,
      reindexOnly: false,
      reason: 'hot_reload_runtime_change',
      file: filename,
      files: touchedFiles,
      lifecycle
    });
  }, DEFAULT_RESTART_DEBOUNCE_MS);

  if (server._hotReloadRestartTimer?.unref) {
    server._hotReloadRestartTimer.unref();
  }

  server._hotReloadRestartScheduled = true;
  emitRestartNotice(server, eventName, filename, buildRestartFiles(server), 'proxy_managed_runtime_restart_scheduled');
  return true;
}

export function clearPendingRuntimeRestart(server) {
  if (!server) {
    return;
  }

  server._pendingHotReloadRestartFiles?.clear?.();
  server._hotReloadRestartScheduled = false;

  if (server._hotReloadRestartTimer) {
    clearTimeout(server._hotReloadRestartTimer);
    server._hotReloadRestartTimer = null;
  }
}

export function queueRuntimeRestart(server, { filename, reason, eventName = 'hot-reload:restart-pending' } = {}) {
  if (!server || !filename) {
    return false;
  }

  ensureRestartState(server).add(filename);

  const runtimeRestartMode = getRuntimeRestartMode(server);
  if (runtimeRestartMode !== 'auto' || !isProxyManaged(server)) {
    const lifecycle = buildRestartLifecycleGuidance({
      restartType: 'hot_reload_runtime_restart',
      proxyMode: runtimeRestartMode === 'auto'
    });
    logger.warn(`${reason || 'Runtime module'} changed - queued manual runtime restart: ${buildRestartFiles(server).join(', ')}`);
    emitRestartNotice(server, eventName, filename, buildRestartFiles(server), 'manual_runtime_restart_required');
    if (typeof server?.emit === 'function') {
      try {
        server.emit('hot-reload:restart-lifecycle', {
          file: filename,
          reason,
          lifecycle
        });
      } catch (error) {
        logger.debug(`Failed to emit hot-reload:restart-lifecycle: ${error.message}`);
      }
    }
    return false;
  }
  return requestProxyManagedRestart(server, filename, reason, eventName);
}
