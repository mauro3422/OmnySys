/**
 * @fileoverview Semantic backfill helpers for system-file repair links.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-system-file-links-semantic
 */

import { parsePersistedArray } from './core-utils.js';
import { getTableColumns, hasColumn, normalizeDbPath } from './metadata-extraction-coverage-repair-shared.js';
import { buildConditionalUpdateStatement, runConditionalUpdate } from './metadata-extraction-coverage-repair-updates.js';

function detectSemanticColumns(db) {
  const atomColumns = getTableColumns(db, 'atoms');
  return {
    hasSharedState: hasColumn(atomColumns, 'shared_state_json'),
    hasEmitters: hasColumn(atomColumns, 'event_emitters_json'),
    hasListeners: hasColumn(atomColumns, 'event_listeners_json'),
    hasScopeType: hasColumn(atomColumns, 'scope_type')
  };
}

function buildSemanticQuery(cols) {
  const selected = ['file_path'];
  const conditions = [];

  if (cols.hasSharedState) {
    selected.push('shared_state_json');
    conditions.push("COALESCE(shared_state_json, '') NOT IN ('', 'null', '[]')");
  }
  if (cols.hasEmitters) {
    selected.push('event_emitters_json');
    conditions.push("COALESCE(event_emitters_json, '') NOT IN ('', 'null', '[]')");
  }
  if (cols.hasListeners) {
    selected.push('event_listeners_json');
    conditions.push("COALESCE(event_listeners_json, '') NOT IN ('', 'null', '[]')");
  }
  if (cols.hasScopeType) selected.push('scope_type');

  const whereClause = conditions.length > 0 ? conditions.join(' OR ') : '1=0';

  return {
    sql: `SELECT ${selected.join(', ')} FROM atoms WHERE (is_removed IS NULL OR is_removed = 0) AND (${whereClause})`,
    selected
  };
}

function addUniqueEntries(bucket, entries, target) {
  for (const entry of entries) {
    const key = typeof entry === 'string' ? entry : JSON.stringify(entry);
    if (!key || bucket.seen.has(`${target}:${key}`)) continue;
    bucket.seen.add(`${target}:${key}`);
    bucket[target].push(entry);
  }
}

function processRowIntoGroup(row, cols, grouped) {
  const filePath = normalizeDbPath(row?.file_path || '');
  if (!filePath) return;

  const bucket = grouped.get(filePath) || {
    sharedStateAccess: [],
    eventEmitters: [],
    eventListeners: [],
    scopeTypes: new Set(),
    seen: new Set()
  };

  if (cols.hasSharedState) addUniqueEntries(bucket, parsePersistedArray(row?.shared_state_json), 'sharedStateAccess');
  if (cols.hasEmitters) addUniqueEntries(bucket, parsePersistedArray(row?.event_emitters_json), 'eventEmitters');
  if (cols.hasListeners) addUniqueEntries(bucket, parsePersistedArray(row?.event_listeners_json), 'eventListeners');

  const scopeType = cols.hasScopeType ? String(row?.scope_type || '').trim() : '';
  if (scopeType) bucket.scopeTypes.add(scopeType);

  grouped.set(filePath, bucket);
}

function buildSystemFileSemanticAnalysisByPath(db) {
  const cols = detectSemanticColumns(db);
  if (!cols.hasSharedState && !cols.hasEmitters && !cols.hasListeners && !cols.hasScopeType) {
    return new Map();
  }

  const { sql } = buildSemanticQuery(cols);
  const rows = db.prepare(sql).all();

  const grouped = new Map();
  for (const row of rows) {
    processRowIntoGroup(row, cols, grouped);
  }

  return grouped;
}

export function backfillSystemFileSemanticAnalysis(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateStmt = buildConditionalUpdateStatement(
    db,
    'system_files',
    'semantic_analysis_json',
    "semantic_analysis_json IS NULL OR semantic_analysis_json = '' OR semantic_analysis_json = '{}'",
    hasUpdatedAt
  );

  const groupedAnalysis = buildSystemFileSemanticAnalysisByPath(db);
  if (groupedAnalysis.size === 0) {
    return 0;
  }

  let updated = 0;
  for (const [filePath, bucket] of groupedAnalysis.entries()) {
    const payload = JSON.stringify({
      sharedState: {
        reads: bucket.sharedStateAccess,
        writes: [],
        all: bucket.sharedStateAccess
      },
      eventPatterns: {
        eventEmitters: bucket.eventEmitters,
        eventListeners: bucket.eventListeners
      },
      sideEffects: {
        hasGlobalAccess: bucket.scopeTypes.has('global') || bucket.sharedStateAccess.length > 0,
        scopeTypes: [...bucket.scopeTypes]
      }
    });
    const result = runConditionalUpdate(updateStmt, hasUpdatedAt, payload, nowIso, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}
