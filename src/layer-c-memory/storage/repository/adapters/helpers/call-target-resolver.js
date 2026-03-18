/**
 * @fileoverview Canonical call target resolver.
 *
 * Resolves call targets against the active atom universe using the source file
 * imports plus atom name lookups. This keeps relation persistence aligned with
 * the canonical atom id scheme instead of relying on local-only guesses.
 *
 * @module storage/repository/adapters/helpers/call-target-resolver
 */

import { normalizeFilePath } from '#shared/compiler/path-normalization.js';

function normalizeComparablePath(value = '') {
  return normalizeFilePath(String(value || ''))
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function safeParseJsonArray(value) {
  if (!value || value === 'null' || value === 'undefined') {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractCalleeName(call) {
  if (typeof call === 'string') {
    return call.trim();
  }

  if (!call || typeof call !== 'object') {
    return '';
  }

  return String(call.callee || call.name || call.id || call.target || call.targetName || '').trim();
}

function extractSourceHint(call) {
  if (!call || typeof call !== 'object') {
    return '';
  }

  return normalizeComparablePath(
    call.resolvedPath ||
    call.targetPath ||
    call.filePath ||
    call.sourcePath ||
    call.targetFile ||
    call.sourceFile ||
    ''
  );
}

function uniquePush(candidates, candidate) {
  if (!candidate) {
    return;
  }

  const normalized = String(candidate).trim();
  if (!normalized) {
    return;
  }

  if (!candidates.includes(normalized)) {
    candidates.push(normalized);
  }
}

function buildNameCandidates(calleeName = '') {
  const candidates = [];
  const trimmed = String(calleeName || '').trim();
  if (!trimmed) {
    return candidates;
  }

  const shortName = trimmed.split('.').pop();
  uniquePush(candidates, trimmed);
  uniquePush(candidates, shortName);

  if (trimmed.includes('::')) {
    uniquePush(candidates, trimmed.split('::').pop());
  }

  return candidates;
}

function buildIdCandidates(sourcePath, calleeName, call = {}, normalizeIdFn = (value) => value) {
  const candidates = [];
  const normalizedSourcePath = normalizeComparablePath(sourcePath);
  const nameCandidates = buildNameCandidates(calleeName);
  const sourceHint = extractSourceHint(call);

  if (calleeName.includes('::')) {
    uniquePush(candidates, normalizeIdFn(calleeName));
  }

  if (sourceHint) {
    for (const nameCandidate of nameCandidates) {
      uniquePush(candidates, normalizeIdFn(`${sourceHint}::${nameCandidate}`));
    }
  }

  for (const nameCandidate of nameCandidates) {
    uniquePush(candidates, normalizeIdFn(`${normalizedSourcePath}::${nameCandidate}`));
  }

  if (call && typeof call === 'object') {
    const explicitId = String(call.targetId || call.calleeId || call.id || '').trim();
    if (explicitId) {
      uniquePush(candidates, normalizeIdFn(explicitId));
    }
  }

  return candidates;
}

function loadImportsForSource(db, importsCache, sourcePath) {
  if (importsCache.has(sourcePath)) {
    return importsCache.get(sourcePath);
  }

  let imports = [];

  try {
    const fileRow = db.prepare(`
      SELECT imports_json
      FROM system_files
      WHERE path = ?
    `).get(sourcePath) || db.prepare(`
      SELECT imports_json
      FROM files
      WHERE path = ?
    `).get(sourcePath);

    imports = safeParseJsonArray(fileRow?.imports_json);
  } catch {
    imports = [];
  }

  importsCache.set(sourcePath, imports);
  return imports;
}

function buildImportedPathCandidates(sourcePath, importEntry) {
  const candidates = [];
  const resolved = normalizeComparablePath(
    importEntry?.resolvedPath ||
    importEntry?.resolved ||
    importEntry?.targetPath ||
    importEntry?.source ||
    ''
  );

  if (!resolved) {
    return candidates;
  }

  const sourceDir = sourcePath.includes('/') ? sourcePath.slice(0, sourcePath.lastIndexOf('/')) : '';
  const imported = resolved.startsWith('.') || resolved.includes('/') ? resolved : `${sourceDir}/${resolved}`;
  uniquePush(candidates, normalizeComparablePath(imported));
  uniquePush(candidates, normalizeComparablePath(resolved));

  return candidates;
}

function resolveByName(db, sourcePath, nameCandidates) {
  if (nameCandidates.length === 0) {
    return null;
  }

  const stmt = db.prepare(`
    SELECT id, file_path, is_exported
    FROM atoms
    WHERE name = ?
      AND (is_removed IS NULL OR is_removed = 0)
    ORDER BY
      CASE WHEN file_path = ? THEN 0 ELSE 1 END,
      CASE WHEN is_exported = 1 THEN 0 ELSE 1 END,
      file_path ASC
    LIMIT 1
  `);

  for (const nameCandidate of nameCandidates) {
    const row = stmt.get(nameCandidate, sourcePath);
    if (row?.id) {
      return row.id;
    }
  }

  return null;
}

export function resolveCallTargetId(db, sourceId, call, normalizeIdFn = (value) => value) {
  if (!db || !sourceId) {
    return null;
  }

  const normalizedSourceId = normalizeIdFn(sourceId);
  const sourcePath = normalizedSourceId.split('::')[0];
  const calleeName = extractCalleeName(call);

  if (!calleeName) {
    return null;
  }

  const activeAtomStmt = db.prepare(`
    SELECT id
    FROM atoms
    WHERE id = ?
      AND (is_removed IS NULL OR is_removed = 0)
    LIMIT 1
  `);

  const candidateIds = buildIdCandidates(sourcePath, calleeName, call, normalizeIdFn);
  for (const candidateId of candidateIds) {
    if (activeAtomStmt.get(candidateId)) {
      return candidateId;
    }
  }

  const nameCandidates = buildNameCandidates(calleeName);
  const importsCache = new Map();
  const imports = loadImportsForSource(db, importsCache, sourcePath);

  for (const importEntry of imports) {
    const importedPaths = buildImportedPathCandidates(sourcePath, importEntry);
    if (importedPaths.length === 0) {
      continue;
    }

    const importSpecifiers = Array.isArray(importEntry?.specifiers) ? importEntry.specifiers : [];
    const isMatch = importSpecifiers.some((spec) => {
      const localName = String(spec?.local || '').trim();
      const importedName = String(spec?.imported || '').trim();
      return nameCandidates.includes(localName) || nameCandidates.includes(importedName);
    }) || importedPaths.some((importedPath) => {
      const explicitHint = extractSourceHint(call);
      return explicitHint && normalizeComparablePath(importedPath) === explicitHint;
    });

    if (!isMatch) {
      continue;
    }

    for (const importedPath of importedPaths) {
      for (const nameCandidate of nameCandidates) {
        const targetId = normalizeIdFn(`${importedPath}::${nameCandidate}`);
        if (activeAtomStmt.get(targetId)) {
          return targetId;
        }
      }
    }
  }

  return resolveByName(db, sourcePath, nameCandidates);
}

export default resolveCallTargetId;
