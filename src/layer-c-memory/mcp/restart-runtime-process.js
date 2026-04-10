import { buildRestartLifecycleGuidance } from '../../shared/compiler/index.js';
import { createLogger } from '../../utils/logger.js';
import {
  buildProcessRestartWarningMessage,
  buildProxyRestartResult,
  purgeRuntimeCache,
  refreshToolRegistrySafely
} from './restart-runtime/index.js';

const logger = createLogger('OmnySys:restart:process');

// Cooldown to prevent restart loops. Shared with hot-reload-manager.
const RESTART_COOLDOWN_MS = 60000;
let _lastRestartAt = 0;

function isRestartCooldownActive() {
  const now = Date.now();
  return _lastRestartAt > 0 && (now - _lastRestartAt) < RESTART_COOLDOWN_MS;
}

function recordRestartTime() {
  _lastRestartAt = Date.now();
}

/**
 * Process restart: kills the Node.js process and respawns it via the proxy.
 *
 * What it DOES:
 *   - Kills and respawns the worker process (fresh ESM module cache)
 *   - Preserves omnysys.db (active atoms, files, relations, etc.)
 *   - Preserves atom-history.db (version evolution archive)
 *   - Preserves health-history.db (metrics snapshots)
 *   - Does NOT trigger Layer A reindex (file watcher handles this)
 *
 * What it does NOT:
 *   - Does NOT delete any database files
 *   - Does NOT clear file_hashes or force reindex
 *   - Does NOT re-analyze code (watcher picks up changes incrementally)
 *
 * When to use:
 *   After editing code and the changes aren't reflected because the old
 *   ESM module cache is still serving stale code. The file watcher will
 *   reindex modified files automatically - no manual reindex needed.
 */
export async function handleProcessRestart({
  clearCache,
  reanalyze,
  reindexOnly,
  cache,
  refreshToolRegistryFn,
  proxyMode
}) {
  // COOLDOWN CHECK: Prevent restart loops. After a processRestart, the file
  // watcher may detect residual changes (new files from refactor, etc.).
  // We suppress restarts for 60s to let Phase 2 settle.
  if (isRestartCooldownActive()) {
    const remaining = Math.round((RESTART_COOLDOWN_MS - (Date.now() - _lastRestartAt)) / 1000);
    logger.warn(`Restart suppressed (cooldown: ${remaining}s remaining). Skipping to prevent loop.`);
    return {
      success: true,
      restarting: false,
      restartType: 'cooldown_suppressed',
      message: `Restart suppressed - cooldown active (${remaining}s remaining). File watcher will reindex changes incrementally.`,
      databasesPreserved: ['omnysys.db', 'atom-history.db', 'health-history.db'],
      timestamp: new Date().toISOString()
    };
  }

  logger.info('Process restart requested - killing worker, preserving all databases...');

  if (!proxyMode) {
    logger.warn('processRestart=true requires proxy mode. In standalone mode, only cache can be cleared.');
    await purgeRuntimeCache(cache, 'Standalone cache cleared');
    await refreshToolRegistrySafely(refreshToolRegistryFn, 'Tool registry refreshed');
    return {
      success: true,
      restarting: false,
      restartType: 'process_restart_standalone',
      lifecycle: buildRestartLifecycleGuidance({ restartType: 'process_restart_standalone', processRestart: true }),
      message: 'Standalone mode: ESM cache cleared but true process restart requires proxy (npm run mcp). DB preserved, no reindex.',
      databasesPreserved: ['omnysys.db', 'atom-history.db', 'health-history.db'],
      timestamp: new Date().toISOString()
    };
  }

  // Proxy mode: signal proxy to kill worker and respawn with --processRestart flag.
  // The proxy may block this due to its own cooldown (survives across worker restarts).
  recordRestartTime();
  if (process.send) {
    process.send({
      type: 'restart',
      clearCache: false,
      reanalyze: false,
      reindexOnly: false,
      processRestart: true,
      file: 'user_requested_process_restart',
      reason: 'manual_process_restart_via_mcp_tool'
    });
  }

  const lifecycle = buildRestartLifecycleGuidance({
    restartType: 'process_restart',
    proxyMode: true,
    processRestart: true
  });

  return {
    success: true,
    restarting: true,
    restartType: 'true_process_restart',
    processRestart: true,
    databasesPreserved: ['omnysys.db', 'atom-history.db', 'health-history.db'],
    lifecycle,
    message: buildProcessRestartWarningMessage(),
    timestamp: new Date().toISOString()
  };
}
