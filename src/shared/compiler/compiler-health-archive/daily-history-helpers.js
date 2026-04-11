import { asNumber } from '../core-utils.js';

export function buildDailySnapshotRows(rows = [], {
  dayKeyField = 'captured_day',
  scoreField = 'health_score',
  kindField = 'snapshot_kind',
  limitPerDay = 3
} = {}) {
  const byDay = new Map();

  for (const row of rows) {
    const dayKey = row?.[dayKeyField] || String(row?.captured_at || '').slice(0, 10);
    if (!dayKey) {
      continue;
    }

    const current = byDay.get(dayKey) || {
      captured_day: dayKey,
      snapshotCount: 0,
      latestCapturedAt: null,
      latestSnapshotKind: null,
      bestSnapshotScore: null,
      bestSnapshotCapturedAt: null,
      bestSnapshotKind: null,
      featuredSnapshot: null,
      entries: []
    };

    current.snapshotCount += 1;
    current.entries.push(row);

    const capturedAt = row?.captured_at || null;
    const score = asNumber(row?.[scoreField], 0);
    if (!current.latestCapturedAt || String(capturedAt || '') > String(current.latestCapturedAt || '')) {
      current.latestCapturedAt = capturedAt;
      current.latestSnapshotKind = row?.[kindField] || null;
      current.featuredSnapshot = row;
    }

    if (current.bestSnapshotScore === null || score > current.bestSnapshotScore) {
      current.bestSnapshotScore = score;
      current.bestSnapshotCapturedAt = capturedAt;
      current.bestSnapshotKind = row?.[kindField] || null;
    }

    byDay.set(dayKey, current);
  }

  return [...byDay.values()]
    .map((day) => ({
      ...day,
      entries: day.entries.slice(0, limitPerDay),
      summaryText: `day=${day.captured_day} | snapshots=${day.snapshotCount} | latest=${day.latestSnapshotKind || 'n/a'}@${day.latestCapturedAt || 'n/a'} | best=${day.bestSnapshotKind || 'n/a'}@${day.bestSnapshotCapturedAt || 'n/a'}`
    }))
    .sort((left, right) => String(right.captured_day).localeCompare(String(left.captured_day)));
}
