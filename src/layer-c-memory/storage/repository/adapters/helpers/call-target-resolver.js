/**
 * @fileoverview Canonical call target resolver.
 *
 * Resolves call targets against the active atom universe using the source file
 * imports plus atom name lookups. This keeps relation persistence aligned with
 * the canonical atom id scheme instead of relying on local-only guesses.
 *
 * @module storage/repository/adapters/helpers/call-target-resolver
 */

import {
  buildIdCandidates,
  buildImportedPathCandidates,
  buildNameCandidates,
  extractCalleeName,
  extractSourceHint,
  normalizeComparablePath,
  pickBestAtomCandidate,
  safeParseJsonArray
} from './call-target-resolution-helpers.js';

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

function resolveFromAtomCache(cache, nameCandidates, sourceComparablePath) {
  if (!(cache?.activeAtomsByName instanceof Map)) {
    return null;
  }

  for (const nameCandidate of nameCandidates) {
    const cachedRows = cache.activeAtomsByName.get(nameCandidate);
    const bestId = pickBestAtomCandidate(cachedRows, sourceComparablePath);
    if (bestId) {
      return bestId;
    }
  }

  return null;
}

function resolveByNameInDatabase(db, nameCandidates, sourcePath) {
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

function resolveByName(db, sourcePath, nameCandidates, cache = null) {
  if (nameCandidates.length === 0) {
    return null;
  }

  const sourceComparablePath = normalizeComparablePath(sourcePath);
  const cachedId = resolveFromAtomCache(cache, nameCandidates, sourceComparablePath);
  if (cachedId) {
    return cachedId;
  }

  return resolveByNameInDatabase(db, nameCandidates, sourcePath);
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

function getResolvedTarget(cache, cacheKey) {
  if (!cacheKey || !cache?.resolvedTargets) {
    return null;
  }

  return cache.resolvedTargets.has(cacheKey)
    ? cache.resolvedTargets.get(cacheKey)
    : null;
}

function storeResolvedTarget(cache, cacheKey, targetId) {
  if (!cacheKey || !cache?.resolvedTargets) {
    return targetId;
  }

  cache.resolvedTargets.set(cacheKey, targetId);
  return targetId;
}

function resolveFromCandidateIds(db, cache, candidateIds, cacheKey, normalizeIdFn) {
  for (const candidateId of candidateIds) {
    if (!hasActiveAtomId(db, candidateId, cache)) {
      continue;
    }

    return storeResolvedTarget(cache, cacheKey, candidateId);
  }

  return null;
}

function importEntryMatchesCall(importEntry, importedPaths, nameCandidates, sourceHint) {
  const importSpecifiers = Array.isArray(importEntry?.specifiers) ? importEntry.specifiers : [];
  const hasSpecifierMatch = importSpecifiers.some((spec) => {
    const localName = String(spec?.local || '').trim();
    const importedName = String(spec?.imported || '').trim();
    return nameCandidates.includes(localName) || nameCandidates.includes(importedName);
  });

  if (hasSpecifierMatch) {
    return true;
  }

  if (!sourceHint) {
    return false;
  }

  return importedPaths.some((importedPath) => normalizeComparablePath(importedPath) === sourceHint);
}

function resolveFromImports(db, sourcePath, call, nameCandidates, cache, normalizeIdFn, cacheKey) {
  const importsCache = cache?.importsBySourcePath || new Map();
  const imports = loadImportsForSource(db, importsCache, sourcePath);
  const sourceHint = extractSourceHint(call);

  for (const importEntry of imports) {
    const importedPaths = buildImportedPathCandidates(sourcePath, importEntry);
    if (importedPaths.length === 0) {
      continue;
    }

    if (!importEntryMatchesCall(importEntry, importedPaths, nameCandidates, sourceHint)) {
      continue;
    }

    for (const importedPath of importedPaths) {
      for (const nameCandidate of nameCandidates) {
        const targetId = normalizeIdFn(`${importedPath}::${nameCandidate}`);
        if (hasActiveAtomId(db, targetId, cache)) {
          return storeResolvedTarget(cache, cacheKey, targetId);
        }
      }
    }
  }

  return null;
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
  const cachedTarget = getResolvedTarget(cache, cacheKey);
  if (cachedTarget) {
    return cachedTarget;
  }

  primeActiveAtomCache(db, cache);

  const candidateIds = buildIdCandidates(sourcePath, calleeName, call, normalizeIdFn);
  const resolvedFromId = resolveFromCandidateIds(db, cache, candidateIds, cacheKey, normalizeIdFn);
  if (resolvedFromId) {
    return resolvedFromId;
  }

  const nameCandidates = buildNameCandidates(calleeName);
  const resolvedFromImports = resolveFromImports(db, sourcePath, call, nameCandidates, cache, normalizeIdFn, cacheKey);
  if (resolvedFromImports) {
    return resolvedFromImports;
  }

  const resolvedByName = resolveByName(db, sourcePath, nameCandidates, cache);
  return storeResolvedTarget(cache, cacheKey, resolvedByName);
}

export default resolveCallTargetId;
