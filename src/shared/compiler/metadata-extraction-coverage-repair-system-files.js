/**
 * @fileoverview System-file repair helpers for metadata extraction coverage.
 *
 * Keeps the large system_files repair logic isolated so the main coverage
 * repair module stays below watcher thresholds.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-system-files
 */
import { parsePersistedArray, safeParseJson } from './core-utils.js';
import { backfillSystemFileSemanticAnalysis, backfillSystemFileTransitiveDependents, backfillSystemFileTransitiveDepends } from './metadata-extraction-coverage-repair-system-file-links.js';
import { getTableColumns, hasColumn, normalizeDbPath } from './metadata-extraction-coverage-repair-shared.js';
const CULTURE_ROLES = {
  entrypoint: 'System entry point (CLI, server, main)',
  gatekeeper: 'Organizes module exports',
  laws: 'Defines constants/templates that condition the system',
  auditor: 'Observes and validates production atoms',
  script: 'Automates maintenance tasks',
  citizen: 'Productive business logic',
  unknown: 'Unclassified'
};
function isEntryPointPath(filePath = '') {
  const normalized = normalizeDbPath(filePath).toLowerCase();
  if (!normalized) return false;
  const fileName = normalized.split('/').pop();
  const rootEntryPoints = new Set(['main.js', 'main.mjs', 'index.js', 'server.js', 'app.js', 'omny.js', 'omnysystem.js', 'cli.js']);
  const isRootFile = !normalized.includes('/') || normalized.indexOf('/') === normalized.lastIndexOf('/');
  if (isRootFile && rootEntryPoints.has(fileName)) {
    return true;
  }
  return /^src\/(cli|server|app|main|index)\.js$/.test(normalized) || /^bin\//.test(normalized);
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
function isScriptPath(filePath = '') {
  const normalized = normalizeDbPath(filePath).toLowerCase();
  return /^scripts?\//.test(normalized);
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
  const rows = db.prepare(`
    SELECT file_path, _meta_json
    FROM atoms
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND _meta_json IS NOT NULL
      AND _meta_json != ''
      AND _meta_json != '{}'
  `).all();
  const grouped = new Map();
  for (const row of rows) {
    const filePath = normalizeDbPath(row?.file_path || '');
    if (!filePath) continue;
    const meta = safeParseJson(row?._meta_json, {});
    const identifiers = Array.isArray(meta?.identifierRefs) ? meta.identifierRefs : [];
    if (identifiers.length === 0) {
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
function resolveSystemFileMetadata(row, definitionsByPath) {
  const filePath = normalizeDbPath(row?.path || '');
  if (!filePath) return null;
  const currentDefinitions = parsePersistedArray(row?.definitions_json);
  const currentExports = parsePersistedArray(row?.exports_json);
  const sourceDefinitions = currentDefinitions.length > 0
    ? currentDefinitions
    : (definitionsByPath.get(filePath) || []);
  const derivedDefinitions = sourceDefinitions
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
  return { filePath, culture, cultureRole, definitionsJson };
}
export function backfillSystemFileCalls(db, nowIso) {
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
export function backfillSystemFileDefinitionsAndCulture(db, nowIso) {
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
    const patch = resolveSystemFileMetadata(row, definitionsByPath);
    if (!patch) continue;
    const hasMissingCulture = !String(row?.culture || '').trim();
    const hasMissingRole = !String(row?.culture_role || '').trim();
    const hasMissingDefinitions = !String(row?.definitions_json || '').trim() || row?.definitions_json === '[]';
    if (!hasMissingCulture && !hasMissingRole && !hasMissingDefinitions) {
      continue;
    }
    const result = hasUpdatedAt
      ? updateStmt.run(patch.culture, patch.cultureRole, patch.definitionsJson, nowIso, patch.filePath)
      : updateStmt.run(patch.culture, patch.cultureRole, patch.definitionsJson, patch.filePath);
    updated += Number(result?.changes || 0);
  }
  return updated;
}
export function backfillSystemFileIdentifierRefs(db, nowIso) {
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

