// Base reload strategy for hot-reload manager.

import path from 'path';
import { pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { createLogger } from '../../../../utils/logger.js';
import { queueRuntimeRestart } from '../restart-coordinator.js';

const logger = createLogger('OmnySys:hot-reload:strategy');

const DEFAULT_RELOAD_PLAN = {
  mode: 'restart',
  restartReason: 'Module',
  fallbackMessage: 'Module changed - restart task to apply (8s)',
  fallbackLevel: 'debug'
};

function hasRealGitChange(projectPath, filename) {
  try {
    const output = execFileSync(
      'git',
      ['status', '--porcelain', '--untracked-files=no', '--', filename],
      { cwd: projectPath, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return String(output || '').trim().length > 0;
  } catch {
    // If git is unavailable, prefer safety and keep current behavior.
    return true;
  }
}

export class BaseStrategy {
  constructor(server) {
    if (new.target === BaseStrategy) {
      throw new TypeError('Cannot instantiate abstract class');
    }
    this.server = server;
  }

  async applyReload(filename) {
    return runReloadPlan(this, filename);
  }

  _resolvePath(filename) {
    return path.resolve(this.server.projectPath, filename);
  }

  _generateUniqueImport(modulePath, prefix = 'reload') {
    // En Windows, path.resolve() devuelve C:\... que no es válido para ESM import().
    // Hay que convertir a file:///C:/... usando pathToFileURL.
    const fileUrl = pathToFileURL(modulePath).href;
    return `${fileUrl}?${prefix}=${Date.now()}`;
  }

  _invalidateCache(moduleId) {
    if (require.cache && require.cache[moduleId]) {
      delete require.cache[moduleId];
      logger.debug(`Invalidated require.cache for: ${moduleId}`);
    }
  }

  _log(action, filename) {
    logger.debug(`${action}: ${filename}`);
  }

  _queueManualRuntimeRestart(filename, reason) {
    if (!hasRealGitChange(this.server?.projectPath, filename)) {
      logger.info(`${reason} change ignored (no real git diff): ${filename}`);
      return false;
    }

    return queueRuntimeRestart(this.server, {
      filename,
      reason,
      eventName: 'hot-reload:restart-pending'
    });
  }

  _requestWorkerRestart(filename, reason) {
    return queueRuntimeRestart(this.server, {
      filename,
      reason,
      eventName: 'hot-reload:restart-pending'
    });
  }
}

export default BaseStrategy;

function runReloadPlan(strategy, filename) {
  const plan = resolveReloadPlan(strategy);

  if (plan.mode === 'log') {
    strategy._log(plan.message, filename);
    return;
  }

  const restartReason = plan.restartReason || DEFAULT_RELOAD_PLAN.restartReason;
  if (strategy._requestWorkerRestart(filename, restartReason)) {
    return;
  }

  const fallbackMessage = plan.fallbackMessage || DEFAULT_RELOAD_PLAN.fallbackMessage;
  if (plan.fallbackLevel === 'warn') {
    logger.warn(`${fallbackMessage}: ${filename}`);
    return;
  }

  strategy._log(fallbackMessage, filename);
}

function resolveReloadPlan(strategy) {
  return strategy.constructor.reloadPlan ?? DEFAULT_RELOAD_PLAN;
}
