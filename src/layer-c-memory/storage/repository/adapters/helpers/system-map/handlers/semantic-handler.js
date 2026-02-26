/**
 * @fileoverview semantic-handler.js
 * Persistence handlers for semantic data
 */
import { safeJson, safeParseJson } from '../../converters.js';

export async function saveSemanticData(db, connections, issues, now) {
  // Connections
  db.prepare('DELETE FROM semantic_connections').run();
  const connStmt = db.prepare(`
    INSERT INTO semantic_connections (from_path, to_path, type, metadata, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const conn of connections) {
    connStmt.run(conn.from, conn.to, conn.type || 'unknown', safeJson(conn.metadata), now);
  }

  // Issues
  db.prepare('DELETE FROM semantic_issues').run();
  const issueStmt = db.prepare(`
    INSERT INTO semantic_issues (file_path, symbol, issue_type, severity, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const issue of issues) {
    issueStmt.run(issue.filePath, issue.symbol, issue.type, issue.severity, issue.description, now);
  }
}

export async function loadSemanticConnections(db) {
  const rows = db.prepare('SELECT * FROM semantic_connections').all();
  return rows.map(r => ({
    from: r.from_path,
    to: r.to_path,
    type: r.type,
    metadata: safeParseJson(r.metadata)
  }));
}

export async function loadSemanticIssues(db) {
  const rows = db.prepare('SELECT * FROM semantic_issues').all();
  return rows.map(r => ({
    filePath: r.file_path,
    symbol: r.symbol,
    type: r.issue_type,
    severity: r.severity,
    description: r.description
  }));
}
