/**
 * @fileoverview Runtime freshness helpers for watcher issue storage.
 *
 * @module shared/compiler/watcher-issue-storage-runtime
 */

import fs from 'fs/promises';
import { isAlertOutdatedByDuplicatePolicy } from './watcher-issue-duplicate-policy.js';
import { normalizeWatcherAlertPath } from './watcher-issue-storage-alerts.js';
import { getAlertFileSnapshot } from './watcher-issue-storage-runtime-snapshot.js';
import {
  isAlertOutdatedByCanonicalSymbols,
  isAlertOutdatedByMissingSymbols,
  getCachedFileContents
} from './watcher-issue-storage-runtime-symbols.js';
import { isAlertOutdatedByRuntimeDependencies } from './watcher-issue-storage-runtime-dependencies.js';

export {
  getAlertFileSnapshot
} from './watcher-issue-storage-runtime-snapshot.js';

export {
  isAlertOutdatedByCanonicalSymbols,
  isAlertOutdatedByMissingSymbols,
  getCachedFileContents
} from './watcher-issue-storage-runtime-symbols.js';

export {
  isAlertOutdatedByRuntimeDependencies
} from './watcher-issue-storage-runtime-dependencies.js';

function getWatcherAlertPrimaryIssue(alert = {}) {
  const context = (alert?.context && typeof alert.context === 'object') ? alert.context : {};
  const issues = Array.isArray(context.issues) ? context.issues : [];
  return issues.length > 0 ? issues[0] : null;
}

function getWatcherAlertFileSizeThreshold(alert = {}) {
  const issue = getWatcherAlertPrimaryIssue(alert);
  const threshold = Number(issue?.threshold);

  if (!Number.isFinite(threshold) || threshold <= 0) {
    return null;
  }

  return threshold;
}

async function isAlertOutdatedByCurrentFileSize(alert, absolutePath, fileContentsCache) {
  const issueType = String(alert?.issueType || '');
  if (!/^code_file_size_/i.test(issueType)) {
    return false;
  }

  const threshold = getWatcherAlertFileSizeThreshold(alert);
  if (!threshold) {
    return false;
  }

  const contents = await getCachedFileContents(absolutePath, fileContentsCache);
  const currentLines = contents ? contents.split(/\r?\n/).length : 0;
  return currentLines < threshold;
}

export async function findOutdatedWatcherAlertIds(projectPath, alerts = [], options = {}) {
  const outdatedIds = [];
  const runtimeDependencyMtimes = new Map();
  const fileContentsCache = new Map();
  const fileSymbolCache = new Map();
  const { db = null } = options;

  for (const alert of alerts) {
    const snapshot = getAlertFileSnapshot(projectPath, {
      ...alert,
      filePath: normalizeWatcherAlertPath(projectPath, alert?.filePath)
    });
    if (!snapshot) continue;

    const { id, detectedAtMs, absolutePath, relativePath } = snapshot;
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.mtimeMs > (detectedAtMs + 1000)) {
        outdatedIds.push(id);
        continue;
      }

      if (await isAlertOutdatedByCurrentFileSize(alert, absolutePath, fileContentsCache)) {
        outdatedIds.push(id);
        continue;
      }

      if (isAlertOutdatedByCanonicalSymbols(alert, relativePath, db, fileSymbolCache)) {
        outdatedIds.push(id);
        continue;
      }

      if (isAlertOutdatedByDuplicatePolicy(alert, relativePath, db)) {
        outdatedIds.push(id);
        continue;
      }

      if (await isAlertOutdatedByMissingSymbols(alert, absolutePath, fileContentsCache)) {
        outdatedIds.push(id);
        continue;
      }
    } catch {
      outdatedIds.push(id);
      continue;
    }

    if (await isAlertOutdatedByRuntimeDependencies(projectPath, detectedAtMs, runtimeDependencyMtimes)) {
      outdatedIds.push(id);
    }
  }

  return outdatedIds;
}
