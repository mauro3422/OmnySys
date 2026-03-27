/**
 * @fileoverview Path helpers for watcher issue storage.
 *
 * @module shared/compiler/watcher-issue-storage-paths
 */

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
