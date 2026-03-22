/**
 * @fileoverview runtime-table-health.js
 *
 * Orquestador de salud de runtime. Delega los chequeos pesados a helpers
 * especializados para mantener el archivo por debajo del umbral del watcher.
 */

import { createLogger } from '../../utils/logger.js';
import { getWatcherIssueDb } from '../file-watcher/watcher-issue-repository.js';
import {
  clearWatcherIssueRecord,
  upsertWatcherIssueRecord
} from '../file-watcher/watcher-issue-persistence.js';
import { buildRuntimeHealthIssues, buildDeepRuntimeHealthIssues, getRuntimeHealthIssueTypes } from './runtime-table-health-helpers.js';
import { repairRiskAssessmentsIfEmpty } from './risk-assessment-repair.js';

const logger = createLogger('OmnySys:runtime:table-health');
const PROJECT_WIDE_FILE = 'project-wide';

function getPhase2PendingFiles(db) {
    try {
        return db.prepare('SELECT COUNT(DISTINCT file_path) as total FROM atoms WHERE is_phase2_complete = 0').get()?.total || 0;
    } catch {
        return 0;
    }
}

export async function syncRuntimeTableHealthIssues(projectPath, options = {}) {
  try {
    const db = options.db || await getWatcherIssueDb(projectPath);
    if (!db) {
      return {
        activeIssues: [],
        persisted: 0,
        cleared: 0,
        tableCounts: {},
        semanticSurfaceGranularity: null,
        liveRowSync: null
      };
    }

    const phase2PendingFiles = getPhase2PendingFiles(db);
    if (phase2PendingFiles === 0) {
      repairRiskAssessmentsIfEmpty(db, logger);
    }

    const runtimeHealth = buildRuntimeHealthIssues(db);
    if (options.deep === true) {
      const deepIssues = await buildDeepRuntimeHealthIssues(projectPath, db);
      runtimeHealth.issues.push(...deepIssues);
    }

    const desiredIssueTypes = new Set(runtimeHealth.issues.map((issue) => issue.issueType));
    let persisted = 0;
    let cleared = 0;

    for (const issue of runtimeHealth.issues) {
      if (upsertWatcherIssueRecord(db, {
        filePath: PROJECT_WIDE_FILE,
        issueType: issue.issueType,
        severity: issue.severity,
        message: issue.message,
        context: issue.context
      })) {
        persisted += 1;
      }
    }

    for (const issueType of getRuntimeHealthIssueTypes()) {
      if (desiredIssueTypes.has(issueType)) continue;
      const result = clearWatcherIssueRecord(db, PROJECT_WIDE_FILE, issueType, 'expired');
      if (Number(result?.changes || 0) > 0) {
        cleared += 1;
      }
    }

    return {
      activeIssues: runtimeHealth.issues,
      persisted,
      cleared,
      tableCounts: runtimeHealth.tableCounts,
      semanticSurfaceGranularity: runtimeHealth.semanticSurfaceGranularity,
      liveRowSync: runtimeHealth.liveRowSync
    };
  } catch (error) {
    logger.error('Failed to sync runtime table health issues:', error.message);
    return {
      activeIssues: [],
      persisted: 0,
      cleared: 0,
      tableCounts: {},
      semanticSurfaceGranularity: null,
      liveRowSync: null,
      error: error.message
    };
  }
}
