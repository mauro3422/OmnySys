/**
 * @fileoverview Canonical runtime/compiler metric snapshots backed by SQLite.
 *
 * @module shared/compiler/compiler-runtime-metrics
 */

import { computeGraphCoverageMetrics } from './compiler-runtime-metrics-graph.js';
import { collectMcpSessionMetrics } from './compiler-runtime-metrics-sessions.js';
import {
  collectIssueMetrics,
  collectConceptualDuplicateMetrics,
  collectFileUniverseMetrics,
  collectWatcherNoiseMetrics
} from './compiler-runtime-metrics-support.js';

export function getAtomCountSummary(db) {
  if (!db) {
    return {
      totalAtoms: 0,
      byType: {},
      callable: { functions: 0, methods: 0, arrows: 0 },
      display: {
        inventory: 'classes=0, functions=0, variables=0',
        callable: 'functions=0, methods=0, arrows=0'
      }
    };
  }

  const rows = db.prepare(`
    SELECT atom_type, COUNT(*) as count
    FROM atoms
    WHERE (is_removed = 0 OR is_removed IS NULL)
    GROUP BY atom_type
  `).all();

  const byType = rows.reduce((acc, row) => {
    acc[row.atom_type] = row.count;
    return acc;
  }, {});

  return {
    totalAtoms: rows.reduce((sum, row) => sum + row.count, 0),
    byType,
    callable: {
      functions: byType.function || 0,
      methods: byType.method || 0,
      arrows: byType.arrow || 0
    },
    display: {
      inventory: [
        `classes=${byType.class || 0}`,
        `functions=${byType.function || 0}`,
        `variables=${byType.variable || 0}`
      ].join(', '),
      callable: [
        `functions=${byType.function || 0}`,
        `methods=${byType.method || 0}`,
        `arrows=${byType.arrow || 0}`
      ].join(', ')
    }
  };
}

export function getPhase2FileCounts(db) {
  if (!db) {
    return {
      pendingFiles: 0,
      completedFiles: 0,
      liveFileCount: 0
    };
  }

  return {
    pendingFiles: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 0').get()?.n || 0,
    completedFiles: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_phase2_complete = 1').get()?.n || 0,
    liveFileCount: db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms WHERE is_removed IS NULL OR is_removed = 0').get()?.n || 0
  };
}

export function getGraphCoverageSummary(db) {
  return computeGraphCoverageMetrics(db);
}

export function getMcpSessionSummary(sessionManager, options = {}) {
  return collectMcpSessionMetrics(sessionManager, options);
}

export function getIssueSummary(db, options = {}) {
  return collectIssueMetrics(db, options);
}

export function getConceptualDuplicateSummary(repo, options = {}) {
  return collectConceptualDuplicateMetrics(repo, options);
}

export function getFileUniverseSummary(db) {
  return collectFileUniverseMetrics(db);
}

export function summarizeWatcherNoise(stats = {}) {
  return collectWatcherNoiseMetrics(stats);
}
