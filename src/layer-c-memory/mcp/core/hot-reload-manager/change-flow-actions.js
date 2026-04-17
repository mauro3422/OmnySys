/**
 * @fileoverview Dispatch reloadable file changes to the correct handler.
 *
 * REINDEX changes (shared/compiler, layer-a-static, etc.) now trigger
 * actual Layer A analysis via the orchestrator instead of just emitting
 * a dead event. This ensures new files/folders get indexed automatically
 * without requiring a full restart.
 */

import { createLogger } from '../../../utils/logger.js';
import { classifyRuntimeChange, RuntimeChangeAction } from './policy/runtime-change-policy.js';
import { queueRuntimeRestart } from './restart-coordinator.js';
import { evaluateAtomRefactoringSignals, buildRestartLifecycleGuidance } from '../../../../shared/compiler/index.js';
import { markInsightsDirty } from '../server-class-helpers.js';

const logger = createLogger('OmnySys:hot-reload');

export function buildHotReloadConformanceContext({ filename, server }) {
  const sharedSignals = ['_pendingHotReloadChanges', '_hotReloadDeferredDrainTimer'];
  return {
    restartLifecycle: buildRestartLifecycleGuidance({
      restartType: 'hot_reload_runtime_restart',
      proxyMode: server?.runtimeRestartMode === 'auto'
    }),
    semanticSignals: evaluateAtomRefactoringSignals({
      name: filename,
      filePath: filename,
      isAsync: true,
      hasErrorHandling: true,
      sharedStateAccess: sharedSignals,
      eventEmitters: ['server.emit']
    })
  };
}

function createInventorySignalsState() {
  return {
    total: 0,
    byType: {},
    byRole: {},
    recent: []
  };
}

function resolveInventoryRole(filename) {
  const normalized = String(filename || '');
  if (normalized.includes('compiler')) return 'compiler';
  if (normalized.includes('mcp')) return 'mcp';
  return 'system';
}

function resolveInventoryType(moduleInfo, policy) {
  return moduleInfo?.type || policy?.reason || 'unknown';
}

function appendInventorySignal(inventorySignals, signal) {
  inventorySignals.total += 1;
  inventorySignals.byType[signal.type] = (inventorySignals.byType[signal.type] || 0) + 1;
  inventorySignals.byRole[signal.role] = (inventorySignals.byRole[signal.role] || 0) + 1;
  inventorySignals.recent = [signal, ...(Array.isArray(inventorySignals.recent) ? inventorySignals.recent : [])].slice(0, 12);
}

function recordInventorySignal(server, filename, moduleInfo, policy) {
  if (!server) return;

  const sharedState = server.sharedState || (server.sharedState = {});
  const inventorySignals = sharedState.inventorySignals || (sharedState.inventorySignals = createInventorySignalsState());
  const surfaceName = String(filename || '').replace(/\\/g, '/').split('/').pop() || filename || 'unknown';
  const type = resolveInventoryType(moduleInfo, policy);
  const role = resolveInventoryRole(filename);

  appendInventorySignal(inventorySignals, {
    surface: surfaceName,
    filePath: filename,
    type,
    role,
    kind: moduleInfo?.kind || null,
    at: new Date().toISOString()
  });

  markInsightsDirty(server, {
    filePath: filename,
    reason: policy?.reason || null,
    changeType: policy?.action || null,
    source: 'hot-reload'
  });
}

export function dispatchReloadableChange({
  eventType,
  filename,
  server,
  moduleInfo,
  policy,
  reloadHandler,
  runtimeContext
}) {
  const resolvedPolicy = policy || classifyRuntimeChange(filename, moduleInfo);

  switch (resolvedPolicy.action) {
    case RuntimeChangeAction.IGNORE:
      logger.debug(`Ignoring non-runtime file: ${filename}`);
      return;
    case RuntimeChangeAction.REFRESH:
      return applyRefreshChange({ eventType, filename, server, moduleInfo, policy: resolvedPolicy, reloadHandler, runtimeContext });
    case RuntimeChangeAction.RESTART:
      return applyRestartChange({ filename, server, policy: resolvedPolicy });
    case RuntimeChangeAction.REINDEX:
      return applyReindexChange({ eventType, filename, server, moduleInfo, policy: resolvedPolicy, runtimeContext });
    default:
      return applyRuntimeReloadChange({ eventType, filename, server, moduleInfo, policy: resolvedPolicy, reloadHandler });
  }
}

function applyRefreshChange({
  eventType,
  filename,
  server,
  moduleInfo,
  policy,
  reloadHandler,
  runtimeContext
}) {
  recordInventorySignal(server, filename, moduleInfo, policy);
  logger.info(`â™»ï¸ Refresh-worthy change detected: ${filename} (${moduleInfo?.type || policy.reason}/${eventType})`);
  server?.emit?.('hot-reload:refresh-requested', {
    file: filename,
    reason: policy.reason,
    action: policy.action,
    lifecycle: runtimeContext.restartLifecycle,
    semanticSignals: runtimeContext.semanticSignals
  });
  reloadHandler.applyModuleReload(filename, moduleInfo);
}

function applyRestartChange({ filename, server, policy }) {
  recordInventorySignal(server, filename, null, policy);
  logger.warn(`ðŸš¨ Runtime restart required: ${filename} (${policy.reason})`);
  queueRuntimeRestart(server, {
    filename,
    reason: policy.reason,
    eventName: 'hot-reload:restart-pending'
  });
}

function applyReindexChange({
  eventType,
  filename,
  server,
  moduleInfo,
  policy,
  runtimeContext
}) {
  recordInventorySignal(server, filename, moduleInfo, policy);
  logger.info(`♻️ Reindex-worthy change detected: ${filename} (${moduleInfo?.type || policy.reason}/${eventType})`);

  // ACTUAL FIX: Trigger Layer A analysis via the orchestrator instead of
  // just emitting a dead event that nobody listens to. This ensures new
  // files/folders get indexed automatically without requiring a restart.
  const orchestrator = server?.orchestrator;
  if (orchestrator?.handleFileChange) {
    const changeType = eventType === 'rename' ? 'created' : 'modified';
    orchestrator.handleFileChange(filename, changeType, { priority: 'high' })
      .catch((err) => {
        logger.warn(`Failed to queue reindex for ${filename}: ${err.message}`);
      });
    logger.info(`  → Queued Layer A analysis for ${filename} (${changeType})`);
  } else {
    logger.warn(`  → No orchestrator available — ${filename} will NOT be reindexed until next full scan`);
  }

  server?.emit?.('hot-reload:reindex-requested', {
    file: filename,
    reason: policy.reason,
    action: policy.action,
    runtimeReloadDeferred: true,
    runtimeRestartMode: server?.runtimeRestartMode || 'manual',
    lifecycle: runtimeContext.restartLifecycle,
    semanticSignals: runtimeContext.semanticSignals
  });

  // NOTE: We intentionally do NOT auto-restart after reindex.
  // Layer A analysis runs in the background and Phase 2 enrichment
  // happens automatically. A restart would be wasteful and could
  // cause the restart loop bug seen when compiler files change.
}

function applyRuntimeReloadChange({ eventType, filename, server, moduleInfo, policy, reloadHandler }) {
  recordInventorySignal(server, filename, moduleInfo, policy);
  logger.info(`â™»ï¸ Runtime change detected: ${filename} (${moduleInfo?.type || 'reloadable surface'}/${eventType})`);
  reloadHandler.applyModuleReload(filename, moduleInfo);
}
