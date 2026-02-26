/**
 * @fileoverview semantic-handler.js
 * Persistence handlers for semantic data
 */
import { safeJson, safeParseJson } from '../../converters.js';

export async function saveSemanticData(db, connections, issues, now) {
  connections = connections || [];
  issues = issues || [];

  // Connections
  db.prepare('DELETE FROM semantic_connections').run();
  const connStmt = db.prepare(`
    INSERT INTO semantic_connections (source_path, target_path, connection_type, context_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const conn of connections) {
    connStmt.run(conn.from, conn.to, conn.type || 'unknown', safeJson(conn.metadata), now);
  }

  // Issues
  db.prepare('DELETE FROM semantic_issues').run();
  const issueStmt = db.prepare(`
    INSERT INTO semantic_issues (file_path, issue_type, severity, message, context_json, detected_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const issue of issues) {
    issueStmt.run(issue.filePath, issue.type || 'unknown', issue.severity || 'low', issue.description || issue.message || '', safeJson({ symbol: issue.symbol }), now);
  }
}

export async function loadSemanticConnections(db) {
  const rows = db.prepare('SELECT * FROM semantic_connections').all();
  return rows.map(r => ({
    from: r.source_path,
    to: r.target_path,
    type: r.connection_type,
    metadata: safeParseJson(r.context_json)
  }));
}

export async function loadSemanticIssues(db) {
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
