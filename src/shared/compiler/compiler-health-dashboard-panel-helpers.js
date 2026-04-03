/**
 * Panel-specific helpers for compiler health dashboard summaries.
 */

import { takeSample } from './sample-helpers.js';

export function buildPanelIdentity(panel = {}) {
  return {
    projectPath: panel.projectPath || null,
    scopePath: panel.scopePath || null,
    focusPath: panel.focusPath || null,
    snapshotKind: panel.snapshotKind || 'status',
    captureSource: panel.captureSource || null,
    capturedAt: panel.capturedAt || null
  };
}

export function buildPanelSections(panel = {}) {
  return {
    status: panel.status || null,
    headline: panel.headline || null,
    now: panel.now || null,
    trend: panel.trend || null,
    performance: panel.performance || null,
    tools: panel.tools || null,
    metricDictionary: panel.metricDictionary || null,
    archive: panel.archive || null
  };
}

export function buildPanelHighlights(panel = {}) {
  return {
    topRegressors: takeSample(panel.topRegressors || [], 3),
    topImprovements: takeSample(panel.topImprovements || [], 3),
    topRecommendations: takeSample(panel.topRecommendations || [], 3),
    nextAction: panel.nextAction || null,
    summary: panel.summary || null,
    oneLine: panel.oneLine || null
  };
}
