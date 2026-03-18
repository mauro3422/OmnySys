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

function resolveByName(db, sourcePath, nameCandidates, cache = null) {
  if (nameCandidates.length === 0) {
    return null;
  }

  const sourceComparablePath = normalizeComparablePath(sourcePath);

  const pickBestCandidate = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const sortedRows = [...rows].sort((left, right) => {
      const leftSameFile = normalizeComparablePath(left.file_path || '') === sourceComparablePath ? 0 : 1;
      const rightSameFile = normalizeComparablePath(right.file_path || '') === sourceComparablePath ? 0 : 1;
      if (leftSameFile !== rightSameFile) return leftSameFile - rightSameFile;

      const leftExported = left.is_exported ? 0 : 1;
      const rightExported = right.is_exported ? 0 : 1;
      if (leftExported !== rightExported) return leftExported - rightExported;

      return String(left.file_path || '').localeCompare(String(right.file_path || ''));
    });

    return sortedRows[0]?.id || null;
  };

  const cachedRowsByName = cache?.activeAtomsByName instanceof Map
    ? cache.activeAtomsByName
    : null;
  if (cachedRowsByName instanceof Map) {
    for (const nameCandidate of nameCandidates) {
      const cachedRows = cachedRowsByName.get(nameCandidate);
      const bestId = pickBestCandidate(cachedRows);
      if (bestId) {
        return bestId;
      }
    }
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

export function primeActiveAtomCache(db, cache = null) {
  if (!db || !cache) {
    return cache;
  }

  if (cache.activeAtomIds && cache.activeAtomsByName) {
    return cache;
  }

  try {
    const rows = db.prepare(`
      SELECT id, name, file_path, is_exported
      FROM atoms
      WHERE is_removed IS NULL OR is_removed = 0
    `).all();

    cache.activeAtomIds = new Set();
    cache.activeAtomsByName = new Map();

    for (const row of rows || []) {
      if (!row?.id) continue;

      cache.activeAtomIds.add(row.id);

      const nameKey = String(row.name || '').trim();
      if (!nameKey) continue;

      const normalizedFilePath = normalizeComparablePath(row.file_path || '');
      const bucket = cache.activeAtomsByName.get(nameKey) || [];
      bucket.push({
        id: row.id,
        file_path: normalizedFilePath,
        is_exported: row.is_exported === 1 || row.is_exported === true
      });
      cache.activeAtomsByName.set(nameKey, bucket);
    }

  } catch {
    cache.activeAtomIds = new Set();
    cache.activeAtomsByName = new Map();
  }

  return cache;
}

function hasActiveAtomId(db, candidateId, cache = null) {
  if (!candidateId) {
    return false;
  }

  if (cache?.activeAtomIds instanceof Set) {
    return cache.activeAtomIds.has(candidateId);
  }

  const activeAtomStmt = db.prepare(`
    SELECT id
    FROM atoms
    WHERE id = ?
      AND (is_removed IS NULL OR is_removed = 0)
    LIMIT 1
  `);

  return !!activeAtomStmt.get(candidateId);
}

export function resolveCallTargetId(db, sourceId, call, normalizeIdFn = (value) => value, cache = null) {
  if (!db || !sourceId) {
    return null;
  }

  const normalizedSourceId = normalizeIdFn(sourceId);
  const sourcePath = normalizedSourceId.split('::')[0];
  const calleeName = extractCalleeName(call);
  const sourceHint = extractSourceHint(call);

  if (!calleeName) {
    return null;
  }

  const cacheKey = cache
    ? `${normalizedSourceId}::${calleeName}::${sourceHint}`
    : null;
  if (cacheKey && cache.resolvedTargets?.has(cacheKey)) {
    return cache.resolvedTargets.get(cacheKey);
  }

  primeActiveAtomCache(db, cache);

  const candidateIds = buildIdCandidates(sourcePath, calleeName, call, normalizeIdFn);
  for (const candidateId of candidateIds) {
    if (hasActiveAtomId(db, candidateId, cache)) {
      if (cacheKey && cache.resolvedTargets) {
        cache.resolvedTargets.set(cacheKey, candidateId);
      }
      return candidateId;
    }
  }

  const nameCandidates = buildNameCandidates(calleeName);
  const importsCache = cache?.importsBySourcePath || new Map();
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
        if (hasActiveAtomId(db, targetId, cache)) {
          if (cacheKey && cache.resolvedTargets) {
            cache.resolvedTargets.set(cacheKey, targetId);
          }
          return targetId;
        }
      }
    }
  }

  const resolvedByName = resolveByName(db, sourcePath, nameCandidates, cache);
  if (cacheKey && cache.resolvedTargets) {
    cache.resolvedTargets.set(cacheKey, resolvedByName);
  }
  return resolvedByName;
}

export default resolveCallTargetId;
