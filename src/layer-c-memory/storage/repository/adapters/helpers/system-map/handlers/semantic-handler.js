/**
 * @fileoverview semantic-handler.js
 * Persistence handlers for semantic data
 */
import { safeJson, safeParseJson } from '../../converters.js';
import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';

export function saveSemanticData(db, connections, issues, now) {
  const repo = new BaseSqlRepository(db, 'SemanticHandler');

  // Connections
  repo.clearTable('semantic_connections');
  if (connections?.length) {
    const connStmt = db.prepare(`
      INSERT INTO semantic_connections (source_path, target_path, connection_type, connection_key, weight, context_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const conn of connections) {
      connStmt.run(
        conn.from,
        conn.to,
        conn.type || 'unknown',
        conn.key || conn.connectionKey || null,
        typeof conn.weight === 'number' ? conn.weight : 1.0,
        safeJson(conn.metadata),
        now
      );
    }
  }

  // Issues — only persist entries with a valid file_path (NOT NULL constraint)
  repo.clearTable('semantic_issues');
  const validIssues = (issues || []).filter(i => i.filePath || i.file_path);
  if (validIssues.length) {
    const issueStmt = db.prepare(`
      INSERT INTO semantic_issues (file_path, issue_type, severity, message, context_json, detected_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const issue of validIssues) {
      issueStmt.run(issue.filePath, issue.type || 'unknown', issue.severity || 'low', issue.description || issue.message || '', safeJson({ symbol: issue.symbol }), now);
    }
  }
}

export function loadSemanticConnections(db) {
  const rows = db.prepare('SELECT * FROM semantic_connections').all();
  return rows.map(r => ({
    from: r.source_path,
    to: r.target_path,
    type: r.connection_type,
    metadata: safeParseJson(r.context_json)
  }));
}

export function loadSemanticIssues(db) {
  const rows = db.prepare('SELECT * FROM semantic_issues').all();
  return rows.map(r => {
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
