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
    const connRows = connections.map(conn => ({
      source_path: conn.from,
      target_path: conn.to,
      connection_type: conn.type || 'unknown',
      connection_key: conn.key || conn.connectionKey || null,
      weight: typeof conn.weight === 'number' ? conn.weight : 1.0,
      context_json: safeJson(conn.metadata),
      created_at: now
    }));

    repo.saveTableRows('semantic_connections',
      ['source_path', 'target_path', 'connection_type', 'connection_key', 'weight', 'context_json', 'created_at'],
      connRows,
      'connection_key'
    );
  }

  // Issues — only persist entries with a valid file_path (NOT NULL constraint)
  repo.clearTable('semantic_issues');
  const validIssues = (issues || []).filter(i => i.filePath || i.file_path);
  if (validIssues.length) {
    const issueRows = validIssues.map(issue => ({
      file_path: issue.filePath || issue.file_path,
      issue_type: issue.type || 'unknown',
      severity: issue.severity || 'low',
      message: issue.description || issue.message || '',
      context_json: safeJson({ symbol: issue.symbol }),
      detected_at: now
    }));

    repo.saveTableRows('semantic_issues',
      ['file_path', 'issue_type', 'severity', 'message', 'context_json', 'detected_at'],
      issueRows,
      'file_path'
    );
  }
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
