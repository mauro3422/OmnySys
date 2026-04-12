/**
 * @fileoverview semantic-handler.js
 * Persistence handlers for semantic data
 */
import { safeJson, safeParseJson } from '../../converters.js';
import { BaseSqlRepository } from '../../../../core/BaseSqlRepository.js';
import { normalizePath } from '#shared/utils/path-utils.js';
import { deriveSemanticConnectionsFromAtomSurface, loadAtomSemanticSurface } from '#shared/compiler/index.js';

function isNonProductionSemanticSurface(filePath = '') {
  const normalized = String(filePath || '')
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '');
  return (
    normalized.startsWith('tests/') ||
    normalized.startsWith('test/') ||
    normalized.includes('/tests/') ||
    normalized.includes('/test/') ||
    normalized.includes('/__tests__/') ||
    normalized.includes('/factories/') ||
    normalized.includes('/fixtures/') ||
    normalized.includes('.test.') ||
    normalized.endsWith('src/utils/logger.js') ||
    normalized.endsWith('src/shared/logger-config.js')
  );
}

function normalizeSemanticIssueSeverity(issue = {}) {
  const issueType = String(issue.type || issue.issue_type || '').toLowerCase();
  const filePath = issue.filePath || issue.file_path || '';
  const severity = String(issue.severity || 'low').toLowerCase();

  if (issueType === 'high-semantic-coupling' && severity === 'high' && isNonProductionSemanticSurface(filePath)) {
    return 'medium';
  }

  return severity;
}

function buildDerivedSemanticRows(db, now) {
  const atomSurface = loadAtomSemanticSurface(db);
  return deriveSemanticConnectionsFromAtomSurface(atomSurface, now).rows;
}

function normalizeLegacyConnectionType(connectionType = '') {
  if (/^eventListener|^eventListeners$/i.test(connectionType)) {
    return 'eventListeners';
  }

  return 'sharedState';
}

function buildFallbackSemanticRows(connections, now) {
  const grouped = new Map();

  for (const conn of connections || []) {
    const sourcePath = conn?.from || conn?.source_path || conn?.sourceFile || null;
    const targetPath = conn?.to || conn?.target_path || conn?.targetFile || null;

    if (!sourcePath || !targetPath) {
      continue;
    }

    const connectionType = normalizeLegacyConnectionType(conn?.type || conn?.connection_type || 'sharedState');
    const connectionKey = conn?.key || conn?.connectionKey || conn?.connection_key || null;
    const groupKey = `${sourcePath}::${targetPath}::${connectionType}::${connectionKey || ''}`;
    const existing = grouped.get(groupKey);

    if (existing) {
      existing.weight += typeof conn?.weight === 'number' ? conn.weight : 1.0;
      continue;
    }

    grouped.set(groupKey, {
      source_path: sourcePath,
      target_path: targetPath,
      connection_type: connectionType,
      connection_key: connectionKey,
      weight: typeof conn?.weight === 'number' ? conn.weight : 1.0,
      context_json: safeJson({
        derivedFrom: 'legacy_semantic_connections',
        originalType: conn?.type || conn?.connection_type || 'unknown',
        key: connectionKey
      }),
      created_at: now,
      is_removed: 0,
      updated_at: now,
      lifecycle_status: 'active'
    });
  }

  return [...grouped.values()];
}

function sameSystemFilePath(candidatePath, filePath) {
  const candidate = normalizePath(candidatePath).toLowerCase();
  const target = normalizePath(filePath).toLowerCase();

  if (!candidate || !target) {
    return false;
  }

  return (
    candidate === target ||
    candidate.endsWith(`/${target}`) ||
    target.endsWith(`/${candidate}`)
  );
}

export function syncSystemFileSemanticConnections(db, now = Date.now()) {
  const semanticRows = db.prepare(`
    SELECT source_path, target_path, connection_type, connection_key, weight, context_json
    FROM semantic_connections
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  const fileRows = db.prepare(`
    SELECT path
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  if (fileRows.length === 0) {
    return 0;
  }

  const semanticByFile = new Map(fileRows.map((row) => [row.path, []]));

  for (const row of semanticRows) {
    const connection = {
      from: row.source_path,
      to: row.target_path,
      type: row.connection_type,
      key: row.connection_key || null,
      weight: Number(row.weight) || 0,
      metadata: safeParseJson(row.context_json) || {}
    };

    for (const { path: filePath } of fileRows) {
      if (
        sameSystemFilePath(row.source_path, filePath) ||
        sameSystemFilePath(row.target_path, filePath)
      ) {
        semanticByFile.get(filePath).push(connection);
      }
    }
  }

  const isoNow = new Date(now).toISOString();
  const columns = db.prepare(`PRAGMA table_info("system_files")`).all();
  const hasUpdatedAt = Array.isArray(columns) && columns.some((column) => column?.name === 'updated_at');
  const hasLifecycleStatus = Array.isArray(columns) && columns.some((column) => column?.name === 'lifecycle_status');
  const assignments = ['semantic_connections_json = ?'];
  if (hasUpdatedAt) {
    assignments.push('updated_at = ?');
  }
  if (hasLifecycleStatus) {
    assignments.push("lifecycle_status = 'active'");
  }
  const updateStmt = db.prepare(`
    UPDATE system_files
    SET ${assignments.join(', ')}
    WHERE path = ?
  `);

  let updated = 0;
  for (const [filePath, connections] of semanticByFile) {
    if (hasUpdatedAt) {
      updateStmt.run(safeJson(connections), isoNow, filePath);
    } else {
      updateStmt.run(safeJson(connections), filePath);
    }
    updated++;
  }

  return updated;
}

export function saveSemanticData(db, connections, issues, now) {
  const repo = new BaseSqlRepository(db, 'SemanticHandler');

  // Connections: MERGE both sources (atom-derived + fallback) with deduplication.
  // BUG FIX: Previously derivedRows replaced fallbackRows entirely, causing 88% loss
  // of semantic_connections (885 → 109) because atom surface is a strict subset of
  // what detectAllSemanticConnections() finds via text-based static analysis.
  repo.clearTable('semantic_connections');
  const derivedRows = buildDerivedSemanticRows(db, now);
  const fallbackRows = buildFallbackSemanticRows(connections, now);

  // Union both sources, deduplicating by source_path + target_path + connection_type + connection_key
  const seen = new Set();
  const connRows = [];
  for (const row of [...derivedRows, ...fallbackRows]) {
    const key = `${row.source_path}::${row.target_path}::${row.connection_type}::${row.connection_key || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    connRows.push(row);
  }

  if (connRows.length) {
    repo.saveTableRows('semantic_connections',
      ['source_path', 'target_path', 'connection_type', 'connection_key', 'weight', 'context_json', 'created_at', 'is_removed', 'updated_at', 'lifecycle_status'],
      connRows
    );
  }

  syncSystemFileSemanticConnections(db, now);

  // Issues — only persist entries with a valid file_path (NOT NULL constraint)
  repo.clearTable('semantic_issues');
  const validIssues = (issues || []).filter(i => i.filePath || i.file_path);
  if (validIssues.length) {
    const issueRows = validIssues.map(issue => ({
      file_path: issue.filePath || issue.file_path,
      issue_type: issue.type || 'unknown',
      severity: normalizeSemanticIssueSeverity(issue),
      message: issue.description || issue.message || '',
      context_json: safeJson({ symbol: issue.symbol }),
      detected_at: now
    }));

    repo.saveTableRows('semantic_issues',
      ['file_path', 'issue_type', 'severity', 'message', 'context_json', 'detected_at'],
      issueRows
    );
  }
}

export function syncSemanticConnectionsFromAtoms(db, now = Date.now()) {
  const repo = new BaseSqlRepository(db, 'SemanticHandler');
  const connRows = buildDerivedSemanticRows(db, now);

  repo.clearTable('semantic_connections');

  if (connRows.length > 0) {
    repo.saveTableRows('semantic_connections',
      ['source_path', 'target_path', 'connection_type', 'connection_key', 'weight', 'context_json', 'created_at', 'is_removed', 'updated_at', 'lifecycle_status'],
      connRows
    );
  }

  const systemFilesUpdated = syncSystemFileSemanticConnections(db, now);

  return {
    total: connRows.length,
    systemFilesUpdated,
    derivedFrom: 'atoms.semantic_surface'
  };
}

export function syncSemanticConnectionsFromRelations(db, now = Date.now()) {
  return syncSemanticConnectionsFromAtoms(db, now);
}

export function loadSemanticConnections(db) {
  const repo = new BaseSqlRepository(db, 'SemanticHandler');
  return repo.loadTableRows('semantic_connections', '(is_removed IS NULL OR is_removed = 0)', [], r => ({
    from: r.source_path,
    to: r.target_path,
    type: r.connection_type,
    metadata: safeParseJson(r.context_json)
  }));
}

export function loadSemanticIssues(db) {
  const repo = new BaseSqlRepository(db, 'SemanticHandler');
  return repo.loadTableRows('semantic_issues', '(is_removed IS NULL OR is_removed = 0)', [], r => {
    const context = safeParseJson(r.context_json) || {};
    return {
      filePath: r.file_path,
      symbol: context.symbol || '',
      type: r.issue_type,
      severity: r.severity,
      description: r.message
    };
  });
}
