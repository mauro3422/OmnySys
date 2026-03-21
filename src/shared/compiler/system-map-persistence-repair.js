/**
 * @fileoverview Repair helpers for persisted system-map tables.
 *
 * Rebuilds mirrored support tables from the primary DB surfaces when they go
 * stale or disappear after a failed reanalysis.
 *
 * @module shared/compiler/system-map-persistence-repair
 */

import path from 'path';
import { toNumber, parsePersistedArray } from './core-utils.js';
import { getSystemMapPersistenceCoverage } from './system-map-persistence.js';

const DEFAULT_DEPENDENCY_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json'];

function normalizeDbPath(value = '') {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function toJsonText(value, fallback = '[]') {
  try {
    return JSON.stringify(value ?? []);
  } catch {
    return fallback;
  }
}

function parseImportSource(importEntry) {
  if (!importEntry) return '';

  if (typeof importEntry === 'string') {
    return importEntry.trim();
  }

  return String(
    importEntry.resolved ||
    importEntry.resolvedPath ||
    importEntry.targetPath ||
    importEntry.target ||
    importEntry.to ||
    importEntry.source ||
    ''
  ).trim();
}

function parseImportSymbols(importEntry) {
  if (!importEntry || typeof importEntry !== 'object') {
    return [];
  }

  if (Array.isArray(importEntry.symbols)) {
    return importEntry.symbols;
  }

  if (Array.isArray(importEntry.specifiers)) {
    return importEntry.specifiers;
  }

  return [];
}

function buildKnownFilePathIndex(rows = []) {
  const knownPaths = new Set();
  const orderedPaths = [];

  for (const row of rows) {
    const normalized = normalizeDbPath(row?.path || '');
    if (!normalized || knownPaths.has(normalized)) {
      continue;
    }

    knownPaths.add(normalized);
    orderedPaths.push(normalized);
  }

  orderedPaths.sort((a, b) => a.length - b.length);
  return { knownPaths, orderedPaths };
}

function generateTargetCandidates(sourcePath, importSource) {
  const source = normalizeDbPath(importSource);
  const candidates = new Set();

  if (!source) {
    return [];
  }

  candidates.add(source);

  if (source.startsWith('.') || source.startsWith('/')) {
    const basePath = normalizeDbPath(sourcePath);
    const sourceDir = path.posix.dirname(basePath);
    const resolved = normalizeDbPath(path.posix.normalize(path.posix.join(sourceDir, source)));
    candidates.add(resolved);

    const withoutExt = resolved.replace(/\.[^./]+$/, '');
    candidates.add(withoutExt);

    for (const extension of DEFAULT_DEPENDENCY_EXTENSIONS) {
      candidates.add(`${withoutExt}${extension}`);
      candidates.add(path.posix.join(withoutExt, `index${extension}`));
    }

    return Array.from(candidates).filter(Boolean);
  }

  const aliasLike = source.replace(/^#/, '').replace(/^@/, '').replace(/^\/+/, '');
  if (!aliasLike) {
    return Array.from(candidates).filter(Boolean);
  }

  const segments = aliasLike.split('/').filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    candidates.add(segments.slice(i).join('/'));
  }

  const withoutExt = aliasLike.replace(/\.[^./]+$/, '');
  candidates.add(withoutExt);
  for (const extension of DEFAULT_DEPENDENCY_EXTENSIONS) {
    candidates.add(`${withoutExt}${extension}`);
    candidates.add(path.posix.join(withoutExt, `index${extension}`));
  }

  return Array.from(candidates).filter(Boolean);
}

function resolveTargetPathFromKnownFiles(sourcePath, importEntry, knownFileIndex) {
  const rawSource = parseImportSource(importEntry);
  if (!rawSource) {
    return null;
  }

  const exactCandidates = generateTargetCandidates(sourcePath, rawSource);

  for (const candidate of exactCandidates) {
    const normalized = normalizeDbPath(candidate);
    if (knownFileIndex.knownPaths.has(normalized)) {
      return normalized;
    }
  }

  const suffixCandidates = generateTargetCandidates('', rawSource)
    .map((candidate) => normalizeDbPath(candidate))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const suffix of suffixCandidates) {
    const matchedPath = knownFileIndex.orderedPaths.find((knownPath) =>
      knownPath === suffix || knownPath.endsWith(`/${suffix}`)
    );
    if (matchedPath) {
      return matchedPath;
    }
  }

  return null;
}

function buildSystemFilesFromPrimaryFiles(db, now) {
  const fileRows = db.prepare(`
    SELECT path, imports_json, exports_json, atom_count, total_lines, module_name, last_analyzed, updated_at
    FROM files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  if (!Array.isArray(fileRows) || fileRows.length === 0) {
    return { systemFiles: [], dependencies: [] };
  }

  const { knownPaths, orderedPaths } = buildKnownFilePathIndex(fileRows);
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

    const imports = parsePersistedArray(fileRow?.imports_json);
    const sourceDependencies = [];

    for (const importEntry of imports) {
      const targetPath = resolveTargetPathFromKnownFiles(sourcePath, importEntry, { knownPaths, orderedPaths });
      if (!targetPath || targetPath === sourcePath) {
        continue;
      }

      const dependencyType = String(importEntry?.type || 'import').trim() || 'import';
      const dependencyKey = `${sourcePath}::${targetPath}::${dependencyType}`;
      if (dependencyKeySet.has(dependencyKey)) {
        continue;
      }

      dependencyKeySet.add(dependencyKey);
      const symbols = parseImportSymbols(importEntry);
      const reason = String(importEntry?.reason || 'files.imports_json').trim() || 'files.imports_json';

      dependencies.push({
        sourcePath,
        targetPath,
        dependencyType,
        symbolsJson: toJsonText(symbols, '[]'),
        reason,
        isDynamic: importEntry?.dynamic ? 1 : dependencyType === 'dynamic' ? 1 : 0,
        createdAt: now,
        updatedAt: now
      });

      sourceDependencies.push(targetPath);
      const dependents = usedByByTarget.get(targetPath) || new Set();
      dependents.add(sourcePath);
      usedByByTarget.set(targetPath, dependents);
    }

    dependencyBySource.set(sourcePath, sourceDependencies);
  }

  const systemFiles = fileRows.map((fileRow) => {
    const sourcePath = normalizeDbPath(fileRow?.path || '');
    const lastAnalyzed = fileRow?.last_analyzed || fileRow?.updated_at || new Date(now).toISOString();
    const dependsOn = dependencyBySource.get(sourcePath) || [];
    const usedBy = [...(usedByByTarget.get(sourcePath) || new Set())];

    return {
      path: sourcePath,
      displayPath: sourcePath,
      culture: null,
      cultureRole: null,
      risk_score: riskByFile.get(sourcePath) || 0,
      semanticAnalysis: {},
      semanticConnections: [],
      exports: parsePersistedArray(fileRow?.exports_json),
      imports: parsePersistedArray(fileRow?.imports_json),
      definitions: [],
      usedBy,
      calls: [],
      identifierRefs: [],
      dependsOn,
      transitiveDepends: [],
      transitiveDependents: [],
      isRemoved: 0,
      updatedAt: lastAnalyzed || new Date(now).toISOString()
    };
  });

  return { systemFiles, dependencies };
}

function repairFromPrimaryFiles(db, now) {
  const { systemFiles, dependencies } = buildSystemFilesFromPrimaryFiles(db, now);
  if (systemFiles.length === 0) {
    return { repaired: false, inserted: 0, sources: 0, dependencies: 0, rebuiltFrom: 'primary_files' };
  }

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

    for (const dependency of dependencies) {
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
    dependencies: dependencies.length,
    rebuiltFrom: 'primary_files'
  };
}

function repairFromSystemFileDependsOn(db) {
  const rows = db.prepare(`
    SELECT path, depends_on_json
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND depends_on_json IS NOT NULL
      AND depends_on_json != ''
      AND depends_on_json != '[]'
  `).all();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { repaired: false, inserted: 0, sources: 0, dependencies: 0, rebuiltFrom: 'system_files' };
  }

  const nowIso = new Date().toISOString();
  const dependencies = [];

  for (const row of rows) {
    const sourcePath = String(row?.path || '').trim();
    if (!sourcePath) continue;

    for (const targetPath of parsePersistedArray(row?.depends_on_json)) {
      const normalizedTargetPath = String(targetPath || '').trim();
      if (!normalizedTargetPath) continue;
      dependencies.push({
        sourcePath,
        targetPath: normalizedTargetPath,
        dependencyType: 'import',
        symbolsJson: '[]',
        reason: 'system_files.depends_on_json',
        isDynamic: 0,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }
  }

  if (dependencies.length === 0) {
    return { repaired: false, inserted: 0, sources: 0, dependencies: 0, rebuiltFrom: 'system_files' };
  }

  db.prepare('DELETE FROM file_dependencies').run();
  const insert = db.prepare(`
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

  db.transaction((records) => {
    for (const record of records) {
      insert.run(
        record.sourcePath,
        record.targetPath,
        record.dependencyType,
        record.symbolsJson,
        record.reason,
        record.isDynamic,
        record.createdAt,
        record.updatedAt
      );
    }
  })(dependencies);

  return {
    repaired: true,
    inserted: dependencies.length,
    sources: new Set(dependencies.map((dependency) => dependency.sourcePath)).size,
    dependencies: dependencies.length,
    rebuiltFrom: 'system_files'
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
      return primaryRepair;
    }
  }

  return repairFromSystemFileDependsOn(db);
}

