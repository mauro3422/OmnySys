/**
 * @fileoverview Repair helpers for persisted system-map tables.
 *
 * Rebuilds mirrored support tables from the primary DB surfaces when they go
 * stale or disappear after a failed reanalysis.
 *
 * @module shared/compiler/system-map-persistence-repair
 */

import { getSystemMapPersistenceCoverage } from './system-map-persistence.js';
import {
  buildKnownFilePathIndex,
  dedupeDependencies,
  loadKnownFilePathRows,
  mergeUniquePathList,
  normalizeDbPath,
  parseImportSymbols,
  resolveTargetPathFromKnownFiles,
  toJsonText
} from './system-map-persistence-repair-paths.js';
import { repairFromSystemFileDependsOn } from './system-map-persistence-repair-dependencies.js';
import { loadSystemFileSnapshots } from './system-map-persistence-repair-helpers.js';

function buildSystemFilesFromPrimaryFiles(db, now) {
  const fileRows = db.prepare(`
    SELECT path, imports_json, exports_json, atom_count, total_lines, module_name, last_analyzed, updated_at
    FROM files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  if (!Array.isArray(fileRows) || fileRows.length === 0) {
    return { systemFiles: [], dependencies: [] };
  }

  const { knownPaths, orderedPaths } = buildKnownFilePathIndex(loadKnownFilePathRows(db));
  const existingSystemFiles = loadSystemFileSnapshots(db);
  const riskRows = db.prepare(`
    SELECT file_path, risk_score
    FROM risk_assessments
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();
  const riskByFile = new Map(riskRows.map((row) => [normalizeDbPath(row?.file_path || ''), Number(row?.risk_score) || 0]));

  const dependencyBySource = new Map();
  const usedByByTarget = new Map();
  const dependencies = [];
  const dependencyKeySet = new Set();

  for (const fileRow of fileRows) {
    const sourcePath = normalizeDbPath(fileRow?.path || '');
    if (!sourcePath) continue;

    const snapshot = existingSystemFiles.get(sourcePath) || {};
    const imports = parsePersistedArray(fileRow?.imports_json);
    const sourceDependencies = [];

    const addDependency = (targetPath, dependencyType, reason, symbolsJson, isDynamic = 0) => {
      const key = `${sourcePath}::${targetPath}::${dependencyType}`;
      if (dependencyKeySet.has(key)) {
        return;
      }

      dependencyKeySet.add(key);
      dependencies.push({
        sourcePath,
        targetPath,
        dependencyType,
        symbolsJson,
        reason,
        isDynamic,
        createdAt: now,
        updatedAt: now
      });

      sourceDependencies.push(targetPath);
      const dependents = usedByByTarget.get(targetPath) || new Set();
      dependents.add(sourcePath);
      usedByByTarget.set(targetPath, dependents);
    };

    for (const importEntry of imports) {
      const targetPath = resolveTargetPathFromKnownFiles(sourcePath, importEntry, { knownPaths, orderedPaths });
      if (!targetPath || targetPath === sourcePath) {
        continue;
      }

      const dependencyType = String(importEntry?.type || 'import').trim() || 'import';
      const symbols = parseImportSymbols(importEntry);
      const reason = String(importEntry?.reason || 'files.imports_json').trim() || 'files.imports_json';
      addDependency(
        targetPath,
        dependencyType,
        reason,
        toJsonText(symbols, '[]'),
        importEntry?.dynamic ? 1 : dependencyType === 'dynamic' ? 1 : 0
      );
    }

    for (const targetPath of mergeUniquePathList(snapshot.dependsOn || [])) {
      if (!targetPath || targetPath === sourcePath) {
        continue;
      }

      addDependency(
        targetPath,
        'import',
        'system_files.depends_on_json',
        '[]',
        0
      );
    }

    dependencyBySource.set(sourcePath, sourceDependencies);
  }

  const systemFiles = fileRows.map((fileRow) => {
    const sourcePath = normalizeDbPath(fileRow?.path || '');
    const snapshot = existingSystemFiles.get(sourcePath) || {};
    const lastAnalyzed = fileRow?.last_analyzed || fileRow?.updated_at || new Date(now).toISOString();
    const dependsOn = dependencyBySource.get(sourcePath) || [];
    const usedBy = [...(usedByByTarget.get(sourcePath) || new Set())];
    const fileImports = parsePersistedArray(fileRow?.imports_json);
    const fileExports = parsePersistedArray(fileRow?.exports_json);

    return {
      path: sourcePath,
      displayPath: snapshot.displayPath || sourcePath,
      culture: snapshot.culture || null,
      cultureRole: snapshot.cultureRole || null,
      risk_score: snapshot.riskScore || riskByFile.get(sourcePath) || 0,
      semanticAnalysis: snapshot.semanticAnalysis || {},
      semanticConnections: snapshot.semanticConnections || [],
      exports: (snapshot.exports || []).length > 0 ? snapshot.exports : fileExports,
      imports: (snapshot.imports || []).length > 0 ? snapshot.imports : fileImports,
      definitions: (snapshot.definitions || []).length > 0 ? snapshot.definitions : [],
      usedBy,
      calls: snapshot.calls || [],
      identifierRefs: snapshot.identifierRefs || [],
      dependsOn,
      transitiveDepends: snapshot.transitiveDepends || [],
      transitiveDependents: snapshot.transitiveDependents || [],
      isRemoved: snapshot.isRemoved ? 1 : 0,
      updatedAt: snapshot.updatedAt || lastAnalyzed || new Date(now).toISOString()
    };
  });

  return { systemFiles, dependencies };
}

function repairFromPrimaryFiles(db, now) {
  const { systemFiles, dependencies } = buildSystemFilesFromPrimaryFiles(db, now);
  if (systemFiles.length === 0) {
    return { repaired: false, inserted: 0, sources: 0, dependencies: 0, rebuiltFrom: 'primary_files' };
  }

  const uniqueDependencies = dedupeDependencies(dependencies);

  db.transaction(() => {
    db.prepare('DELETE FROM system_files').run();

    const insertSystemFile = db.prepare(`
      INSERT INTO system_files (
        path,
        display_path,
        culture,
        culture_role,
        risk_score,
        semantic_analysis_json,
        semantic_connections_json,
        exports_json,
        imports_json,
        definitions_json,
        used_by_json,
        calls_json,
        identifier_refs_json,
        depends_on_json,
        transitive_depends_json,
        transitive_dependents_json,
        is_removed,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const row of systemFiles) {
      insertSystemFile.run(
        row.path,
        row.displayPath,
        row.culture,
        row.cultureRole,
        row.risk_score,
        toJsonText(row.semanticAnalysis, '{}'),
        toJsonText(row.semanticConnections, '[]'),
        toJsonText(row.exports, '[]'),
        toJsonText(row.imports, '[]'),
        toJsonText(row.definitions, '[]'),
        toJsonText(row.usedBy, '[]'),
        toJsonText(row.calls, '[]'),
        toJsonText(row.identifierRefs, '[]'),
        toJsonText(row.dependsOn, '[]'),
        toJsonText(row.transitiveDepends, '[]'),
        toJsonText(row.transitiveDependents, '[]'),
        row.isRemoved ? 1 : 0,
        row.updatedAt
      );
    }

    db.prepare('DELETE FROM file_dependencies').run();
    const insertDependency = db.prepare(`
      INSERT INTO file_dependencies (
        source_path,
        target_path,
        dependency_type,
        symbols_json,
        reason,
        is_dynamic,
        is_removed,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    for (const dependency of uniqueDependencies) {
      insertDependency.run(
        dependency.sourcePath,
        dependency.targetPath,
        dependency.dependencyType,
        dependency.symbolsJson,
        dependency.reason,
        dependency.isDynamic,
        dependency.createdAt,
        dependency.updatedAt
      );
    }
  })();

  return {
    repaired: true,
    inserted: systemFiles.length,
    sources: systemFiles.length,
    dependencies: uniqueDependencies.length,
    rebuiltFrom: 'primary_files'
  };
}

export function repairSystemMapPersistenceCoverage(db) {
  const initialCoverage = getSystemMapPersistenceCoverage(db);
  const now = Date.now();

  if (initialCoverage.healthy === true) {
    return { repaired: false, inserted: 0, sources: 0, dependencies: 0 };
  }

  const shouldRepairFromPrimaryFiles =
    initialCoverage.systemFilesTotal === 0 ||
    initialCoverage.systemFilesWithImports === 0 ||
    initialCoverage.fileDependenciesTotal === 0;

  if (shouldRepairFromPrimaryFiles) {
    const primaryRepair = repairFromPrimaryFiles(db, now);
    if (primaryRepair.repaired === true) {
      const dependencyRepair = repairFromSystemFileDependsOn(db);
      if (dependencyRepair.repaired === true) {
        return {
          ...primaryRepair,
          repaired: true,
          dependencies: dependencyRepair.dependencies,
          inserted: primaryRepair.inserted,
          sources: primaryRepair.sources,
          rebuiltFrom: `${primaryRepair.rebuiltFrom}+${dependencyRepair.rebuiltFrom}`
        };
      }

      return primaryRepair;
    }
  }

  return repairFromSystemFileDependsOn(db);
}
