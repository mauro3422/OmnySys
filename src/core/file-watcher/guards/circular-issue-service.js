/**
 * @fileoverview Persistence helpers for circular dependency watcher alerts.
 *
 * Separates alert writing/cleanup from circular analysis so the guard stays
 * focused on classification and orchestration.
 *
 * @module core/file-watcher/guards/circular-issue-service
 */

import {
  clearWatcherIssue,
  clearWatcherIssueFamily,
  persistWatcherIssue
} from '../watcher-issue-persistence.js';
import {
  IssueDomains,
  createIssueType
} from './guard-standards.js';

export async function persistCircularIssue(rootPath, filePath, severity, message, context) {
  try {
    await persistWatcherIssue(
      rootPath,
      filePath,
      createIssueType(IssueDomains.ARCH, 'circular', severity),
      severity,
      message,
      context
    );
  } catch {
    // Watcher persistence already degrades gracefully; avoid bubbling runtime noise.
  }
}

export async function clearCircularIssues(rootPath, filePath) {
  try {
    await clearWatcherIssueFamily(rootPath, filePath, 'arch_circular');
    await clearWatcherIssue(rootPath, filePath, 'arch_circular_call_high');
    await clearWatcherIssue(rootPath, filePath, 'arch_circular_import_high');
  } catch {
    // Clearing alerts should never block circular analysis.
  }
}
