/**
 * @fileoverview Grouping and resolution helpers for system-file repair coverage.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-system-files-grouping
 */

import { parsePersistedArray, safeParseJson } from './core-utils.js';
import { normalizeDbPath } from './metadata-extraction-coverage-repair-shared.js';
import {
  classifySystemFileCulture,
  cultureRoleForCulture
} from './metadata-extraction-coverage-repair-system-files-classification.js';

export function buildAtomDefinitionsByPath(db) {
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

export function buildSystemFileCallsByPath(db) {
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

export function buildSystemFileIdentifiersByPath(db) {
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

export function resolveSystemFileMetadata(row, definitionsByPath) {
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
