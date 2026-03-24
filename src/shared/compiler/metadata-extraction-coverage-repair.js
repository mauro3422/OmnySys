/**
 * @fileoverview Repair helpers for metadata extraction coverage.
 *
 * Backfills canonical metadata fields from already-persisted support tables so
 * the runtime can self-heal when a new field was added but old rows were never
 * materialized.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair
 */

import { parsePersistedArray } from './core-utils.js';

const TEST_CALLBACK_TYPES = [
  ['describe', /^describe(?:\b|_)/i],
  ['it', /^it(?:\b|_)/i],
  ['test', /^test(?:\b|_)/i],
  ['beforeEach', /^beforeEach(?:\b|_)/i],
  ['afterEach', /^afterEach(?:\b|_)/i],
  ['beforeAll', /^beforeAll(?:\b|_)/i],
  ['afterAll', /^afterAll(?:\b|_)/i]
];

const CULTURE_ROLES = {
  entrypoint: 'System entry point (CLI, server, main)',
  gatekeeper: 'Organizes module exports',
  laws: 'Defines constants/templates that condition the system',
  auditor: 'Observes and validates production atoms',
  script: 'Automates maintenance tasks',
  citizen: 'Productive business logic',
  unknown: 'Unclassified'
};

function normalizeDbPath(value = '') {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function isTestFilePath(filePath = '') {
  const normalized = normalizeDbPath(filePath).toLowerCase();
  return (
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    normalized.includes('/test/') ||
    normalized.includes('/tests/') ||
    normalized.includes('/__tests__/')
  );
}

function inferTestCallbackType(name = '') {
  const normalized = String(name || '').trim();
  if (!normalized) return null;

  for (const [type, pattern] of TEST_CALLBACK_TYPES) {
    if (pattern.test(normalized)) {
      return type;
    }
  }

  return null;
}

function isEntryPointPath(filePath = '') {
  const normalized = normalizeDbPath(filePath).toLowerCase();
  if (!normalized) {
    return false;
  }

  const fileName = normalized.split('/').pop();
  const rootEntryPoints = new Set(['main.js', 'main.mjs', 'index.js', 'server.js', 'app.js', 'omny.js', 'omnysystem.js', 'cli.js']);
  const isRootFile = !normalized.includes('/') || normalized.indexOf('/') === normalized.lastIndexOf('/');

  if (isRootFile && rootEntryPoints.has(fileName)) {
    return true;
  }

  return /^src\/(cli|server|app|main|index)\.js$/.test(normalized) || /^bin\//.test(normalized);
}

function isScriptPath(filePath = '') {
  const normalized = normalizeDbPath(filePath).toLowerCase();
  return /^scripts?\//.test(normalized);
}

function isTestPath(filePath = '') {
  const normalized = normalizeDbPath(filePath).toLowerCase();
  return (
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    normalized.includes('/test/') ||
    normalized.includes('/tests/') ||
    normalized.includes('/__tests__/')
  );
}

function buildAtomDefinitionsByPath(db) {
  const rows = db.prepare(`
    SELECT file_path, name, atom_type, parameter_count, line_start, line_end
    FROM atoms
    WHERE (is_removed IS NULL OR is_removed = 0)
    ORDER BY file_path ASC, line_start ASC, line_end ASC, name ASC
  `).all();

  const grouped = new Map();

  for (const row of rows) {
    const filePath = normalizeDbPath(row?.file_path || '');
    if (!filePath) continue;

    const bucket = grouped.get(filePath) || [];
    bucket.push({
      type: String(row?.atom_type || 'function').trim() || 'function',
      name: String(row?.name || '').trim(),
      params: Number(row?.parameter_count) || 0,
      lineStart: Number(row?.line_start) || null,
      lineEnd: Number(row?.line_end) || null
    });
    grouped.set(filePath, bucket);
  }

  return grouped;
}

function classifySystemFileCulture(filePath, definitions = [], exports = []) {
  if (isEntryPointPath(filePath)) {
    return 'entrypoint';
  }

  if (isTestPath(filePath)) {
    return 'auditor';
  }

  if (definitions.length === 0 && Array.isArray(exports) && exports.length > 0 && normalizeDbPath(filePath).endsWith('index.js')) {
    return 'gatekeeper';
  }

  if (definitions.length === 0 && Array.isArray(exports) && exports.length > 0) {
    return 'laws';
  }

  if (isScriptPath(filePath) && definitions.length > 0) {
    return 'script';
  }

  if (definitions.length > 0) {
    return 'citizen';
  }

  return 'unknown';
}

function cultureRoleForCulture(culture) {
  return CULTURE_ROLES[culture] || CULTURE_ROLES.unknown;
}

function buildSystemFileCallsByPath(db) {
  const rows = db.prepare(`
    SELECT file_path, calls_json
    FROM atoms
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND calls_json IS NOT NULL
      AND calls_json != ''
      AND calls_json != '[]'
  `).all();

  const grouped = new Map();

  for (const row of rows) {
    const filePath = normalizeDbPath(row?.file_path || '');
    if (!filePath) continue;

    const calls = parsePersistedArray(row?.calls_json);
    if (!Array.isArray(calls) || calls.length === 0) {
      continue;
    }

    const bucket = grouped.get(filePath) || { items: [], seen: new Set() };
    for (const call of calls) {
      const key = typeof call === 'string' ? call : JSON.stringify(call);
      if (!key || bucket.seen.has(key)) continue;
      bucket.seen.add(key);
      bucket.items.push(call);
    }

    grouped.set(filePath, bucket);
  }

  return grouped;
}

function buildSystemFileIdentifiersByPath(db) {
  const atomColumns = getTableColumns(db, 'atoms');
  if (!hasColumn(atomColumns, 'identifier_refs_json')) {
    return new Map();
  }

  const rows = db.prepare(`
    SELECT file_path, identifier_refs_json
    FROM atoms
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND identifier_refs_json IS NOT NULL
      AND identifier_refs_json != ''
      AND identifier_refs_json != '[]'
  `).all();

  const grouped = new Map();

  for (const row of rows) {
    const filePath = normalizeDbPath(row?.file_path || '');
    if (!filePath) continue;

    const identifiers = parsePersistedArray(row?.identifier_refs_json);
    if (!Array.isArray(identifiers) || identifiers.length === 0) {
      continue;
    }

    const bucket = grouped.get(filePath) || { items: [], seen: new Set() };
    for (const identifier of identifiers) {
      const key = typeof identifier === 'string' ? identifier : JSON.stringify(identifier);
      if (!key || bucket.seen.has(key)) continue;
      bucket.seen.add(key);
      bucket.items.push(identifier);
    }

    grouped.set(filePath, bucket);
  }

  return grouped;
}

function buildSystemFileSemanticAnalysisByPath(db) {
  const atomColumns = getTableColumns(db, 'atoms');
  const hasSharedState = hasColumn(atomColumns, 'shared_state_json');
  const hasEmitters = hasColumn(atomColumns, 'event_emitters_json');
  const hasListeners = hasColumn(atomColumns, 'event_listeners_json');
  const hasScopeType = hasColumn(atomColumns, 'scope_type');

  if (!hasSharedState && !hasEmitters && !hasListeners && !hasScopeType) {
    return new Map();
  }

  const selectedColumns = ['file_path'];
  if (hasSharedState) selectedColumns.push('shared_state_json');
  if (hasEmitters) selectedColumns.push('event_emitters_json');
  if (hasListeners) selectedColumns.push('event_listeners_json');
  if (hasScopeType) selectedColumns.push('scope_type');

  const rows = db.prepare(`
    SELECT ${selectedColumns.join(', ')}
    FROM atoms
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND (
        ${hasSharedState ? "COALESCE(shared_state_json, '') NOT IN ('', 'null', '[]')" : '1=0'}
        ${hasEmitters ? "OR COALESCE(event_emitters_json, '') NOT IN ('', 'null', '[]')" : ''}
        ${hasListeners ? "OR COALESCE(event_listeners_json, '') NOT IN ('', 'null', '[]')" : ''}
      )
  `).all();

  const grouped = new Map();

  for (const row of rows) {
    const filePath = normalizeDbPath(row?.file_path || '');
    if (!filePath) continue;

    const bucket = grouped.get(filePath) || {
      sharedStateAccess: [],
      eventEmitters: [],
      eventListeners: [],
      scopeTypes: new Set(),
      seen: new Set()
    };

    const addEntries = (entries, target) => {
      for (const entry of entries) {
        const key = typeof entry === 'string' ? entry : JSON.stringify(entry);
        if (!key || bucket.seen.has(`${target}:${key}`)) continue;
        bucket.seen.add(`${target}:${key}`);
        bucket[target].push(entry);
      }
    };

    if (hasSharedState) {
      addEntries(parsePersistedArray(row?.shared_state_json), 'sharedStateAccess');
    }
    if (hasEmitters) {
      addEntries(parsePersistedArray(row?.event_emitters_json), 'eventEmitters');
    }
    if (hasListeners) {
      addEntries(parsePersistedArray(row?.event_listeners_json), 'eventListeners');
    }

    const scopeType = hasScopeType ? String(row?.scope_type || '').trim() : '';
    if (scopeType) {
      bucket.scopeTypes.add(scopeType);
    }

    grouped.set(filePath, bucket);
  }

  return grouped;
}

function buildDependencyGraph(db) {
  const dependencyColumns = getTableColumns(db, 'file_dependencies');
  if (!Array.isArray(dependencyColumns) || dependencyColumns.length === 0) {
    return { forward: new Map(), reverse: new Map() };
  }

  const rows = db.prepare(`
    SELECT source_path, target_path
    FROM file_dependencies
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  const forward = new Map();
  const reverse = new Map();

  for (const row of rows) {
    const sourcePath = normalizeDbPath(row?.source_path || '');
    const targetPath = normalizeDbPath(row?.target_path || '');
    if (!sourcePath || !targetPath || sourcePath === targetPath) continue;

    const forwardBucket = forward.get(sourcePath) || new Set();
    forwardBucket.add(targetPath);
    forward.set(sourcePath, forwardBucket);

    const reverseBucket = reverse.get(targetPath) || new Set();
    reverseBucket.add(sourcePath);
    reverse.set(targetPath, reverseBucket);
  }

  return { forward, reverse };
}

function collectTransitivePaths(startPath, graph) {
  const normalizedStart = normalizeDbPath(startPath);
  if (!normalizedStart) return [];

  const visited = new Set();
  const queue = [...(graph.get(normalizedStart) || [])];

  while (queue.length > 0) {
    const current = normalizeDbPath(queue.shift() || '');
    if (!current || current === normalizedStart || visited.has(current)) {
      continue;
    }
    visited.add(current);
    const next = graph.get(current);
    if (next) {
      for (const item of next) {
        const normalized = normalizeDbPath(item || '');
        if (normalized && !visited.has(normalized)) {
          queue.push(normalized);
        }
      }
    }
  }

  return [...visited].sort();
}

function getTableColumns(db, table) {
  return db.prepare(`PRAGMA table_info("${table}")`).all();
}

function hasColumn(columns, columnName) {
  return Array.isArray(columns) && columns.some((column) => column?.name === columnName);
}

function backfillAtomTestCallbackTypes(db, nowIso) {
  const rows = db.prepare(`
    SELECT id, name, file_path
    FROM atoms
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND (test_callback_type IS NULL OR test_callback_type = '')
  `).all();

  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const updateStmt = db.prepare(`
    UPDATE atoms
    SET test_callback_type = ?, is_test_callback = 1, updated_at = ?
    WHERE id = ?
  `);

  let updated = 0;
  for (const row of rows) {
    if (!isTestFilePath(row?.file_path)) continue;

    const callbackType = inferTestCallbackType(row?.name || '');
    if (!callbackType) continue;

    updateStmt.run(callbackType, nowIso, row.id);
    updated++;
  }

  return updated;
}

function backfillFileHashes(db, nowIso) {
  const hashRows = db.prepare(`
    SELECT file_path, content_hash
    FROM file_hashes
    WHERE content_hash IS NOT NULL
      AND content_hash != ''
  `).all();

  if (!Array.isArray(hashRows) || hashRows.length === 0) {
    return 0;
  }

  const updates = new Map();
  for (const row of hashRows) {
    const path = normalizeDbPath(row?.file_path || '');
    const hash = String(row?.content_hash || '').trim();
    if (!path || !hash) continue;
    updates.set(path, hash);
  }

  if (updates.size === 0) {
    return 0;
  }

  const fileColumns = getTableColumns(db, 'files');
  const hasUpdatedAt = hasColumn(fileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE files SET hash = ?, updated_at = ? WHERE path = ? AND (hash IS NULL OR hash = '')`
    : `UPDATE files SET hash = ? WHERE path = ? AND (hash IS NULL OR hash = '')`;
  const updateStmt = db.prepare(updateSql);

  let updated = 0;
  for (const [filePath, hash] of updates) {
    const result = hasUpdatedAt
      ? updateStmt.run(hash, nowIso, filePath)
      : updateStmt.run(hash, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

function backfillSystemFileCalls(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE system_files SET calls_json = ?, updated_at = ? WHERE path = ? AND (calls_json IS NULL OR calls_json = '' OR calls_json = '[]')`
    : `UPDATE system_files SET calls_json = ? WHERE path = ? AND (calls_json IS NULL OR calls_json = '' OR calls_json = '[]')`;
  const updateStmt = db.prepare(updateSql);

  const groupedCalls = buildSystemFileCallsByPath(db);
  if (groupedCalls.size === 0) {
    return 0;
  }

  let updated = 0;
  for (const [filePath, bucket] of groupedCalls.entries()) {
    const payload = JSON.stringify(bucket.items);
    const result = hasUpdatedAt
      ? updateStmt.run(payload, nowIso, filePath)
      : updateStmt.run(payload, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

function backfillSystemFileIdentifiers(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE system_files SET identifier_refs_json = ?, updated_at = ? WHERE path = ? AND (identifier_refs_json IS NULL OR identifier_refs_json = '' OR identifier_refs_json = '[]')`
    : `UPDATE system_files SET identifier_refs_json = ? WHERE path = ? AND (identifier_refs_json IS NULL OR identifier_refs_json = '' OR identifier_refs_json = '[]')`;
  const updateStmt = db.prepare(updateSql);

  const groupedIdentifiers = buildSystemFileIdentifiersByPath(db);
  if (groupedIdentifiers.size === 0) {
    return 0;
  }

  let updated = 0;
  for (const [filePath, bucket] of groupedIdentifiers.entries()) {
    const payload = JSON.stringify(bucket.items);
    const result = hasUpdatedAt
      ? updateStmt.run(payload, nowIso, filePath)
      : updateStmt.run(payload, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

function backfillSystemFileSemanticAnalysis(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE system_files SET semantic_analysis_json = ?, updated_at = ? WHERE path = ? AND (semantic_analysis_json IS NULL OR semantic_analysis_json = '' OR semantic_analysis_json = '{}')`
    : `UPDATE system_files SET semantic_analysis_json = ? WHERE path = ? AND (semantic_analysis_json IS NULL OR semantic_analysis_json = '' OR semantic_analysis_json = '{}')`;
  const updateStmt = db.prepare(updateSql);

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
    const result = hasUpdatedAt
      ? updateStmt.run(payload, nowIso, filePath)
      : updateStmt.run(payload, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

function backfillSystemFileTransitiveDependents(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE system_files SET transitive_dependents_json = ?, updated_at = ? WHERE path = ? AND (transitive_dependents_json IS NULL OR transitive_dependents_json = '' OR transitive_dependents_json = '[]')`
    : `UPDATE system_files SET transitive_dependents_json = ? WHERE path = ? AND (transitive_dependents_json IS NULL OR transitive_dependents_json = '' OR transitive_dependents_json = '[]')`;
  const updateStmt = db.prepare(updateSql);

  const { reverse } = buildDependencyGraph(db);
  const rows = db.prepare(`
    SELECT path
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  let updated = 0;
  for (const row of rows) {
    const filePath = normalizeDbPath(row?.path || '');
    if (!filePath) continue;

    const dependents = collectTransitivePaths(filePath, reverse);
    if (dependents.length === 0) {
      continue;
    }

    const result = hasUpdatedAt
      ? updateStmt.run(JSON.stringify(dependents), nowIso, filePath)
      : updateStmt.run(JSON.stringify(dependents), filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

function backfillSystemFileTransitiveDepends(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE system_files SET transitive_depends_json = ?, updated_at = ? WHERE path = ? AND (transitive_depends_json IS NULL OR transitive_depends_json = '' OR transitive_depends_json = '[]')`
    : `UPDATE system_files SET transitive_depends_json = ? WHERE path = ? AND (transitive_depends_json IS NULL OR transitive_depends_json = '' OR transitive_depends_json = '[]')`;
  const updateStmt = db.prepare(updateSql);

  const { forward } = buildDependencyGraph(db);
  const rows = db.prepare(`
    SELECT path
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  let updated = 0;
  for (const row of rows) {
    const filePath = normalizeDbPath(row?.path || '');
    if (!filePath) continue;

    const dependsOn = collectTransitivePaths(filePath, forward);
    if (dependsOn.length === 0) {
      continue;
    }

    const result = hasUpdatedAt
      ? updateStmt.run(JSON.stringify(dependsOn), nowIso, filePath)
      : updateStmt.run(JSON.stringify(dependsOn), filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

function backfillSystemFileDefinitionsAndCulture(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE system_files SET culture = ?, culture_role = ?, definitions_json = ?, updated_at = ? WHERE path = ? AND ((culture IS NULL OR culture = '') OR (culture_role IS NULL OR culture_role = '') OR (definitions_json IS NULL OR definitions_json = '' OR definitions_json = '[]'))`
    : `UPDATE system_files SET culture = ?, culture_role = ?, definitions_json = ? WHERE path = ? AND ((culture IS NULL OR culture = '') OR (culture_role IS NULL OR culture_role = '') OR (definitions_json IS NULL OR definitions_json = '' OR definitions_json = '[]'))`;
  const updateStmt = db.prepare(updateSql);

  const definitionsByPath = buildAtomDefinitionsByPath(db);
  const rows = db.prepare(`
    SELECT path, culture, culture_role, definitions_json, exports_json
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  let updated = 0;
  for (const row of rows) {
    const filePath = normalizeDbPath(row?.path || '');
    if (!filePath) continue;

    const currentDefinitions = parsePersistedArray(row?.definitions_json);
    const currentExports = parsePersistedArray(row?.exports_json);
    const derivedDefinitions = (currentDefinitions.length > 0 ? currentDefinitions : (definitionsByPath.get(filePath) || []))
      .map((definition) => ({
        type: String(definition?.type || 'function').trim() || 'function',
        name: String(definition?.name || '').trim(),
        params: Number(definition?.params ?? definition?.parameterCount ?? 0) || 0
      }))
      .filter((definition) => definition.name);

    const culture = String(row?.culture || '').trim() || classifySystemFileCulture(filePath, derivedDefinitions, currentExports);
    const cultureRole = String(row?.culture_role || '').trim() || cultureRoleForCulture(culture);
    const definitionsJson = currentDefinitions.length > 0
      ? row?.definitions_json
      : JSON.stringify(derivedDefinitions);

    const result = hasUpdatedAt
      ? updateStmt.run(culture, cultureRole, definitionsJson, nowIso, filePath)
      : updateStmt.run(culture, cultureRole, definitionsJson, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

export function repairMetadataExtractionCoverage(db) {
  if (!db?.prepare) {
    return {
      repaired: false,
      atomsUpdated: 0,
      fileHashesUpdated: 0,
      systemFilesUpdated: 0,
      rebuiltFrom: 'metadata_extraction_coverage'
    };
  }

  const nowIso = new Date().toISOString();
  const atomsUpdated = backfillAtomTestCallbackTypes(db, nowIso);
  const fileHashesUpdated = backfillFileHashes(db, nowIso);
  const systemFilesUpdated = backfillSystemFileCalls(db, nowIso);
  const systemFilesMetadataUpdated = backfillSystemFileDefinitionsAndCulture(db, nowIso);
  const systemFilesIdentifiersUpdated = backfillSystemFileIdentifiers(db, nowIso);
  const systemFilesSemanticUpdated = backfillSystemFileSemanticAnalysis(db, nowIso);
  const systemFilesTransitiveUpdated = backfillSystemFileTransitiveDependents(db, nowIso);
  const systemFilesTransitiveDependsUpdated = backfillSystemFileTransitiveDepends(db, nowIso);

  return {
    repaired:
      atomsUpdated > 0 ||
      fileHashesUpdated > 0 ||
      systemFilesUpdated > 0 ||
      systemFilesMetadataUpdated > 0 ||
      systemFilesIdentifiersUpdated > 0 ||
      systemFilesSemanticUpdated > 0 ||
      systemFilesTransitiveUpdated > 0 ||
      systemFilesTransitiveDependsUpdated > 0,
    atomsUpdated,
    fileHashesUpdated,
    systemFilesUpdated,
    systemFilesMetadataUpdated,
    systemFilesIdentifiersUpdated,
    systemFilesSemanticUpdated,
    systemFilesTransitiveUpdated,
    systemFilesTransitiveDependsUpdated,
    rebuiltFrom: 'metadata_extraction_coverage'
  };
}

export default repairMetadataExtractionCoverage;
