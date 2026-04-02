import { saveSystemFiles } from './system-map/handlers/file-handler.js';
import { safeJson, safeParseJson, safeString } from './converters.js';

function normalizeStoredPath(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function loadExistingSystemFileSnapshot(db, filePath) {
  if (!db?.prepare) {
    return {};
  }

  const row = db.prepare(`
    SELECT *
    FROM system_files
    WHERE path = ?
      AND (is_removed IS NULL OR is_removed = 0)
  `).get(normalizeStoredPath(filePath));

  if (!row) {
    return {};
  }

  return {
    path: normalizeStoredPath(row.path),
    displayPath: row.display_path || row.path || filePath,
    culture: row.culture || null,
    cultureRole: row.culture_role || null,
    riskScore: Number(row.risk_score) || 0,
    semanticAnalysis: safeParseJson(row.semantic_analysis_json || '{}', {}) || {},
    semanticConnections: safeParseJson(row.semantic_connections_json || '[]', []) || [],
    exports: safeParseJson(row.exports_json || '[]', []) || [],
    imports: safeParseJson(row.imports_json || '[]', []) || [],
    definitions: safeParseJson(row.definitions_json || '[]', []) || [],
    usedBy: safeParseJson(row.used_by_json || '[]', []) || [],
    calls: safeParseJson(row.calls_json || '[]', []) || [],
    identifierRefs: safeParseJson(row.identifier_refs_json || '[]', []) || [],
    dependsOn: safeParseJson(row.depends_on_json || '[]', []) || [],
    transitiveDepends: safeParseJson(row.transitive_depends_json || '[]', []) || [],
    transitiveDependents: safeParseJson(row.transitive_dependents_json || '[]', []) || [],
    isRemoved: Number(row.is_removed) || 0,
    updatedAt: row.updated_at || null
  };
}

function extractImportTarget(importEntry) {
  const candidate = importEntry?.resolvedPath
    || importEntry?.resolved
    || importEntry?.targetPath
    || importEntry?.target
    || importEntry?.to
    || importEntry?.source
    || '';

  return normalizeStoredPath(candidate);
}

function buildDependencyRows(sourcePath, imports, now) {
  const dependencyRows = [];
  const dependencyTargets = [];
  const seen = new Set();
  const isoNow = new Date(now).toISOString();

  for (const importEntry of Array.isArray(imports) ? imports : []) {
    const targetPath = extractImportTarget(importEntry);
    if (!targetPath || targetPath === sourcePath) {
      continue;
    }

    const dependencyType = safeString(importEntry?.type || 'import', 'import');
    const dedupeKey = `${sourcePath}::${targetPath}::${dependencyType}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    dependencyTargets.push(targetPath);
    dependencyRows.push({
      source_path: sourcePath,
      target_path: targetPath,
      dependency_type: dependencyType,
      symbols_json: safeJson(importEntry?.specifiers || importEntry?.symbols || []),
      reason: safeString(importEntry?.reason || 'files.imports_json', 'files.imports_json'),
      is_dynamic: importEntry?.dynamic ? 1 : (dependencyType === 'dynamic' ? 1 : 0),
      created_at: isoNow
    });
  }

  return {
    dependencyRows,
    dependencyTargets: Array.from(new Set(dependencyTargets))
  };
}

function loadUsedBySources(db, targetPath) {
  if (!db?.prepare) {
    return [];
  }

  return db.prepare(`
    SELECT DISTINCT source_path
    FROM file_dependencies
    WHERE target_path = ?
      AND (is_removed IS NULL OR is_removed = 0)
    ORDER BY source_path
  `).all(normalizeStoredPath(targetPath)).map((row) => normalizeStoredPath(row.source_path));
}

function updateSystemFilesUsedBy(db, filePaths, now) {
  if (!db?.prepare || !Array.isArray(filePaths) || filePaths.length === 0) {
    return 0;
  }

  const columns = db.prepare('PRAGMA table_info("system_files")').all();
  const hasUpdatedAt = Array.isArray(columns) && columns.some((column) => column?.name === 'updated_at');
  const hasLifecycleStatus = Array.isArray(columns) && columns.some((column) => column?.name === 'lifecycle_status');

  const assignments = ['used_by_json = ?'];
  if (hasUpdatedAt) {
    assignments.push('updated_at = ?');
  }
  if (hasLifecycleStatus) {
    assignments.push("lifecycle_status = 'active'");
  }

  const stmt = db.prepare(`
    UPDATE system_files
    SET ${assignments.join(', ')}
    WHERE path = ?
  `);

  const isoNow = new Date(now).toISOString();
  let updated = 0;

  for (const filePath of filePaths) {
    const usedBy = loadUsedBySources(db, filePath);
    if (hasUpdatedAt) {
      stmt.run(safeJson(usedBy), isoNow, normalizeStoredPath(filePath));
    } else {
      stmt.run(safeJson(usedBy), normalizeStoredPath(filePath));
    }
    updated += 1;
  }

  return updated;
}

function buildSystemFilePayload(fileAnalysis, existingSnapshot, dependencyTargets, usedBy) {
  return {
    displayPath: fileAnalysis.displayPath
      || fileAnalysis.filePath
      || existingSnapshot.displayPath
      || fileAnalysis.fileName
      || fileAnalysis.filePath,
    culture: existingSnapshot.culture || null,
    cultureRole: existingSnapshot.cultureRole || null,
    riskScore: existingSnapshot.riskScore || 0,
    semanticAnalysis: fileAnalysis.metadata || existingSnapshot.semanticAnalysis || {},
    semanticConnections: Array.isArray(fileAnalysis.semanticConnections) && fileAnalysis.semanticConnections.length > 0
      ? fileAnalysis.semanticConnections
      : (existingSnapshot.semanticConnections || []),
    exports: Array.isArray(fileAnalysis.exports) ? fileAnalysis.exports : (existingSnapshot.exports || []),
    imports: Array.isArray(fileAnalysis.imports) ? fileAnalysis.imports : (existingSnapshot.imports || []),
    definitions: Array.isArray(fileAnalysis.definitions) ? fileAnalysis.definitions : (existingSnapshot.definitions || []),
    usedBy,
    calls: Array.isArray(fileAnalysis.calls) ? fileAnalysis.calls : (existingSnapshot.calls || []),
    identifierRefs: existingSnapshot.identifierRefs || [],
    dependsOn: dependencyTargets,
    transitiveDepends: existingSnapshot.transitiveDepends || dependencyTargets,
    transitiveDependents: existingSnapshot.transitiveDependents || usedBy,
    isRemoved: 0
  };
}

/**
 * Persiste una única superficie de system map a partir del análisis de un archivo.
 * Actualiza el mirror `system_files` y rehace las dependencias salientes del archivo.
 */
export async function syncIncrementalSystemMapSurface(repo, fileAnalysis, now = Date.now()) {
  if (!repo?.db || repo.db.open === false || !fileAnalysis?.filePath) {
    return {
      skipped: true,
      reason: 'repository unavailable or file analysis missing'
    };
  }

  const sourcePath = normalizeStoredPath(fileAnalysis.filePath);
  const existingSnapshot = loadExistingSystemFileSnapshot(repo.db, sourcePath);
  const { dependencyRows, dependencyTargets } = buildDependencyRows(sourcePath, fileAnalysis.imports || [], now);
  const touchedPaths = Array.from(new Set([
    sourcePath,
    ...dependencyTargets,
    ...existingSnapshot.dependsOn.map(normalizeStoredPath)
  ].filter(Boolean)));
  const usedByForSource = loadUsedBySources(repo.db, sourcePath);
  const sourcePayload = buildSystemFilePayload(
    fileAnalysis,
    existingSnapshot,
    dependencyTargets,
    usedByForSource
  );

  const insertDependencyStmt = repo.db.prepare(`
    INSERT INTO file_dependencies (
      source_path,
      target_path,
      dependency_type,
      symbols_json,
      reason,
      is_dynamic,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteDependenciesStmt = repo.db.prepare(`
    DELETE FROM file_dependencies
    WHERE source_path = ?
  `);

  repo.db.transaction(() => {
    deleteDependenciesStmt.run(sourcePath);
    saveSystemFiles(repo.db, { [sourcePath]: sourcePayload }, now);

    for (const dependency of dependencyRows) {
      insertDependencyStmt.run(
        dependency.source_path,
        dependency.target_path,
        dependency.dependency_type,
        dependency.symbols_json,
        dependency.reason,
        dependency.is_dynamic,
        dependency.created_at
      );
    }

    updateSystemFilesUsedBy(repo.db, touchedPaths, now);
  })();

  return {
    skipped: false,
    sourcePath,
    dependenciesSaved: dependencyRows.length,
    systemFilesTouched: touchedPaths.length,
    usedByRecomputed: touchedPaths.length
  };
}
