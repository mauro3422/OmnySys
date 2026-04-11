import path from 'path';
import Database from 'better-sqlite3';
import { normalizeKey } from '#shared/utils/normalize-helpers.js';

export function mergeHistoryRows(primaryRows = [], secondaryRows = []) {
  const rows = [...primaryRows, ...secondaryRows].filter(Boolean);
  const seen = new Set();

  return rows
    .filter((row) => {
      const fingerprint = row?.snapshot_fingerprint
        || `${row?.captured_at || 'unknown'}|${row?.health_score || 0}|${row?.issue_count || 0}|${row?.summary_text || ''}`;
      if (!fingerprint || seen.has(fingerprint)) {
        return false;
      }
      seen.add(fingerprint);
      return true;
    })
    .sort((left, right) => String(right?.captured_at || '').localeCompare(String(left?.captured_at || '')));
}

export function resolveArchiveReadFallback(projectPath, {
  tableName,
  snapshotKind = 'status',
  scopePath = null,
  focusPath = null,
  limit = 12,
  compareDays = 3,
  dailyQuery = null,
  rowQuery = null,
  baselineQuery = null
} = {}) {
  const normalizedScope = normalizeKey(scopePath);
  const normalizedFocus = normalizeKey(focusPath);
  const baselineCutoff = new Date(Date.now() - (compareDays * 24 * 60 * 60 * 1000)).toISOString();
  const result = {
    rows: [],
    dailyRows: [],
    baselineRow: null,
    previousRow: null,
    latestRow: null
  };

  if (!projectPath) {
    return result;
  }

  try {
    const archivePath = path.join(projectPath, '.omnysysdata', 'health-history.db');
    const archiveDb = new Database(archivePath, { readonly: true });
    if (rowQuery) {
      result.rows = archiveDb.prepare(rowQuery).all(projectPath, snapshotKind, normalizedScope, normalizedFocus, limit) || [];
    }
    if (dailyQuery) {
      result.dailyRows = archiveDb.prepare(dailyQuery).all(projectPath, snapshotKind, normalizedScope, normalizedFocus, Math.max(limit * 5, 25)) || [];
    }
    if (baselineQuery) {
      result.baselineRow = archiveDb.prepare(baselineQuery).get(projectPath, snapshotKind, normalizedScope, normalizedFocus, baselineCutoff) || null;
    }
    archiveDb.close();
  } catch {
    // ignore archive fallback failures
  }

  result.latestRow = result.rows[0] || null;
  result.previousRow = result.rows[1] || null;
  return result;
}

export function summarizeDailyRows(rows = [], {
  dayField = 'captured_day',
  valueField = 'health_score'
} = {}) {
  const byDay = new Map();

  for (const row of rows) {
    const dayKey = row?.[dayField] || String(row?.captured_at || '').slice(0, 10);
    if (!dayKey) continue;

    const current = byDay.get(dayKey) || { day: dayKey, count: 0, latestCapturedAt: null, latestSnapshotKind: null, bestValue: null, entries: [] };
    current.count += 1;
    current.entries.push(row);

    const capturedAt = row?.captured_at || null;
    const value = Number(row?.[valueField] || 0);
    if (!current.latestCapturedAt || String(capturedAt || '') > String(current.latestCapturedAt || '')) {
      current.latestCapturedAt = capturedAt;
      current.latestSnapshotKind = row?.snapshot_kind || null;
    }
    if (current.bestValue === null || value > current.bestValue) {
      current.bestValue = value;
    }
    byDay.set(dayKey, current);
  }

  return [...byDay.values()]
    .map((day) => ({
      capturedDay: day.day,
      snapshotCount: day.count,
      latestCapturedAt: day.latestCapturedAt,
      latestSnapshotKind: day.latestSnapshotKind,
      bestValue: day.bestValue,
      entries: day.entries.slice(0, 3),
      summaryText: `day=${day.day} | snapshots=${day.count} | latest=${day.latestSnapshotKind || 'n/a'}@${day.latestCapturedAt || 'n/a'}`
    }))
    .sort((left, right) => String(right.capturedDay).localeCompare(String(left.capturedDay)));
}
