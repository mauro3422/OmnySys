/**
 * @fileoverview Delegated runtime/compiler summaries.
 *
 * @module shared/compiler/compiler-runtime-metrics-summary
 */

import { computeGraphCoverageMetrics } from './compiler-runtime-metrics-graph.js';
import { collectMcpSessionMetrics } from './compiler-runtime-metrics-sessions.js';
import {
  collectIssueMetrics,
  collectConceptualDuplicateMetrics,
  collectFileUniverseMetrics,
  collectWatcherNoiseMetrics
} from './compiler-runtime-metrics-support.js';

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
