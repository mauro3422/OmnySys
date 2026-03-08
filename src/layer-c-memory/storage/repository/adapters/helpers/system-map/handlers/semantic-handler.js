/**
 * @fileoverview semantic-handler.js
 * Persistence handlers for semantic data
 */
import { safeJson, safeParseJson } from '../../converters.js';
import { BaseSqlRepository } from '../../../../core/BaseSqlRepository.js';

function buildDerivedSemanticRows(db, now) {
  return db.prepare(`
    SELECT
      a1.file_path as source_path,
      a2.file_path as target_path,
      CASE
        WHEN ar.relation_type = 'shares_state' THEN 'sharedState'
        WHEN ar.relation_type IN ('emits', 'listens') THEN 'eventListeners'
        ELSE 'unknown'
      END as connection_type,
      json_extract(ar.context_json, '$.key') as connection_key,
      COUNT(*) as weight
    FROM atom_relations ar
    JOIN atoms a1 ON a1.id = ar.source_id
    JOIN atoms a2 ON a2.id = ar.target_id
    WHERE ar.relation_type IN ('shares_state', 'emits', 'listens')
      AND (ar.is_removed IS NULL OR ar.is_removed = 0)
      AND (a1.is_removed IS NULL OR a1.is_removed = 0)
      AND (a2.is_removed IS NULL OR a2.is_removed = 0)
      AND a1.file_path IS NOT NULL
      AND a2.file_path IS NOT NULL
    GROUP BY a1.file_path, a2.file_path, ar.relation_type, json_extract(ar.context_json, '$.key')
  `).all().map((row) => ({
    source_path: row.source_path,
    target_path: row.target_path,
    connection_type: row.connection_type,
    connection_key: row.connection_key,
    weight: Number(row.weight) || 0,
    context_json: safeJson({
      derivedFrom: 'atom_relations',
      relationType: row.connection_type === 'sharedState' ? 'shares_state' : 'event_derived'
    }),
    created_at: now,
    is_removed: 0,
    updated_at: now,
    lifecycle_status: 'active'
  }));
}

export function saveSemanticData(db, connections, issues, now) {
  const repo = new BaseSqlRepository(db, 'SemanticHandler');

  // Connections
  repo.clearTable('semantic_connections');
  const connRows = connections?.length
    ? connections.map(conn => ({
      source_path: conn.from,
      target_path: conn.to,
      connection_type: conn.type || 'unknown',
      connection_key: conn.key || conn.connectionKey || null,
      weight: typeof conn.weight === 'number' ? conn.weight : 1.0,
      context_json: safeJson(conn.metadata),
      created_at: now,
      is_removed: 0,
      updated_at: now,
      lifecycle_status: 'active'
    }))
    : buildDerivedSemanticRows(db, now);

  if (connRows.length) {
    repo.saveTableRows('semantic_connections',
      ['source_path', 'target_path', 'connection_type', 'connection_key', 'weight', 'context_json', 'created_at', 'is_removed', 'updated_at', 'lifecycle_status'],
      connRows
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
      issueRows
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
