/**
 * Archive window drift detector for compiler health surfaces.
 *
 * Compares the health archive lifetime against the visible persisted metric
 * window so terminal summaries can flag when the live surface is stale.
 */

import { asNumber } from './core-utils.js';

function resolveObservedDays(source = null) {
  if (!source) {
    return 0;
  }

  if (Number.isFinite(source)) {
    return asNumber(source, 0);
  }

  if (Array.isArray(source)) {
    return source.length;
  }

  if (typeof source !== 'object') {
    return 0;
  }

  if (Number.isFinite(source.daysObserved)) {
    return asNumber(source.daysObserved, 0);
  }

  if (Array.isArray(source.daily)) {
    return source.daily.length;
  }

  if (Array.isArray(source.entries)) {
    const uniqueDays = new Set();
    for (const entry of source.entries) {
      const day = entry?.capturedDay || entry?.captured_day || String(entry?.capturedAt || entry?.captured_at || '').slice(0, 10);
      if (day) {
        uniqueDays.add(day);
      }
    }
    return uniqueDays.size || source.entries.length;
  }

  return 0;
}

export function buildArchiveWindowDrift(healthArchive = null, metricsArchive = null, history = null) {
  const archiveDays = resolveObservedDays(healthArchive);
  const metricsDays = resolveObservedDays(metricsArchive);
  const historyDays = resolveObservedDays(history);
  const visibleDays = Math.max(metricsDays, historyDays);

  if (archiveDays === 0 && visibleDays === 0) {
    return {
      state: 'missing',
      healthy: false,
      trustworthy: false,
      archiveDays,
      metricsDays,
      historyDays: visibleDays,
      gapDays: 0,
      reason: 'No archive history is available yet.',
      recommendation: 'Capture or restore the metrics archive before trusting the terminal lifetime summary.'
    };
  }

  if (visibleDays === 0) {
    return {
      state: 'watching',
      healthy: false,
      trustworthy: false,
      archiveDays,
      metricsDays,
      historyDays: visibleDays,
      gapDays: archiveDays,
      reason: `Archive lifetime is available (${archiveDays}d), but the visible history window is empty.`,
      recommendation: 'Refresh the live history snapshot or reattach the archive summary source.'
    };
  }

  const gapDays = Math.max(0, visibleDays - archiveDays);
  if (gapDays === 0) {
    return {
      state: 'fresh',
      healthy: true,
      trustworthy: true,
      archiveDays,
      metricsDays,
      historyDays: visibleDays,
      gapDays,
      reason: 'Archive lifetime matches the visible history window.',
      recommendation: 'Keep the archive summary aligned with the persisted metrics window.'
    };
  }

  const state = gapDays >= 3 ? 'stale' : 'watching';
  const sourceLabel = metricsDays > 0 ? 'metrics archive' : 'visible history';

  return {
    state,
    healthy: state === 'watching',
    trustworthy: state !== 'stale',
    archiveDays,
    metricsDays,
    historyDays: visibleDays,
    gapDays,
    reason: `The ${sourceLabel} shows ${visibleDays} day(s) while the health archive only surfaces ${archiveDays} day(s).`,
    recommendation: 'Reconcile the archive summary helper so the terminal mirrors the persisted history window.'
  };
}

export default {
  buildArchiveWindowDrift
};
