/**
 * @fileoverview Shared storage helpers for watcher diagnostics.
 *
 * Keeps path normalization and stale snapshot detection reusable across
 * FileWatcher persistence/runtime surfaces.
 *
 * @module shared/compiler/watcher-issue-storage
 */

import fs from 'fs/promises';
import path from 'path';
import { normalizePath } from '#shared/utils/path-utils.js';

export function normalizeWatcherIssueFilePath(projectPath, filePath) {
  const rawPath = String(filePath || '').trim();
  if (!rawPath) return rawPath;

  const normalized = path.isAbsolute(rawPath)
    ? path.relative(projectPath, rawPath)
    : rawPath;

  return normalizePath(normalized);
}

export async function findOutdatedWatcherAlertIds(projectPath, alerts = []) {
  const outdatedIds = [];

  for (const alert of alerts) {
    const id = alert?.id;
    if (!Number.isInteger(id)) continue;

    const detectedAtMs = Date.parse(alert?.detectedAt || '');
    if (!Number.isFinite(detectedAtMs)) continue;

    const relativePath = String(alert?.filePath || '');
    if (!relativePath) continue;

    const absolutePath = path.resolve(projectPath, relativePath);
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.mtimeMs > (detectedAtMs + 1000)) {
        outdatedIds.push(id);
      }
    } catch {
      // If the file no longer exists, regular lifecycle cleanup will handle it.
    }
  }

  return outdatedIds;
}
