/**
 * OmnySystem DB API Server
 * Reads omnysys.db, atom-history.db, health-history.db directly via better-sqlite3
 * Exposes REST endpoints for the browser app
 */
import { createServer } from 'http';
import { join, resolve } from 'path';
import Database from 'better-sqlite3';

const PORT = 3377;
const PROJECT_ROOT = resolve(import.meta.dirname, '../../');
const DATA_DIR = join(PROJECT_ROOT, '.omnysysdata');

// ── DB Connections (cached, instant after first open) ──────────────────
let mainDb, historyDb, healthDb;

function getMainDb() {
  if (!mainDb) {
    const p = join(DATA_DIR, 'omnysys.db');
    console.log(`[db-api] Opening main DB: ${p}`);
    mainDb = new Database(p, { readonly: true, fileMustExist: true });
    mainDb.pragma('journal_mode = WAL');
    mainDb.pragma('cache_size = -64000'); // 64MB cache
    console.log(`[db-api] Main DB ready`);
  }
  return mainDb;
}

function getHistoryDb() {
  if (!historyDb) {
    const p = join(DATA_DIR, 'atom-history.db');
    try {
      historyDb = new Database(p, { readonly: true, fileMustExist: true });
      historyDb.pragma('journal_mode = WAL');
    } catch { historyDb = null; }
  }
  return historyDb;
}

function getHealthDb() {
  if (!healthDb) {
    const p = join(DATA_DIR, 'health-history.db');
    try {
      healthDb = new Database(p, { readonly: true, fileMustExist: true });
      healthDb.pragma('journal_mode = WAL');
    } catch { healthDb = null; }
  }
  return healthDb;
}

// ── Helper: safe query ─────────────────────────────────────────────────
function safeAll(db, sql, params = []) {
  try { return db.prepare(sql).all(...params); }
  catch (e) { console.error(`[db-api] Query error: ${e.message}`); return []; }
}

function safeGet(db, sql, params = []) {
  try { return db.prepare(sql).get(...params) || null; }
  catch (e) { console.error(`[db-api] Query error: ${e.message}`); return null; }
}

function hasTable(db, name) {
  const r = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(name);
  return !!r;
}

// ── Route Handlers ─────────────────────────────────────────────────────

function getStats() {
  const db = getMainDb();
  const safe = (table, sql, fallback = 0) => {
    if (!hasTable(db, table)) return fallback;
    const row = safeGet(db, sql);
    return row ? Object.values(row)[0] : fallback;
  };
  return {
    totalAtoms: safe('atoms', `SELECT COUNT(*) as n FROM atoms WHERE is_removed = 0`),
    totalFiles: safe('system_files', `SELECT COUNT(*) as n FROM system_files WHERE is_removed = 0`),
    totalRelations: safe('atom_relations', `SELECT COUNT(*) as n FROM atom_relations WHERE is_removed = 0`),
    totalEvents: safe('watcher_issues', `SELECT COUNT(*) as n FROM watcher_issues`)
               || safe('atom_events', `SELECT COUNT(*) as n FROM atom_events`),
    avgComplexity: safe('atoms', `SELECT ROUND(AVG(complexity), 2) as n FROM atoms WHERE is_removed = 0`),
    maxComplexity: safe('atoms', `SELECT MAX(complexity) as n FROM atoms WHERE is_removed = 0`),
  };
}

function getFiles(limit = 5000) {
  const db = getMainDb();
  if (!hasTable(db, 'system_files')) return [];
  const hasRisk = hasTable(db, 'risk_assessments');
  const hasAtoms = hasTable(db, 'atoms');

  const selects = [
    'sf.path',
    'sf.display_path as displayPath',
    hasRisk ? `COALESCE(ra.risk_score, sf.risk_score, 0) as riskScore` : `COALESCE(sf.risk_score, 0) as riskScore`,
    hasRisk ? `COALESCE(ra.risk_level, 'low') as riskLevel` : `'low' as riskLevel`,
    `COALESCE(sf.culture, 'unknown') as culture`,
  ];

  if (hasAtoms) {
    selects.push(`(SELECT COUNT(*) FROM atoms a WHERE a.file_path = sf.path AND a.is_removed = 0) as atomCount`);
    selects.push(`(SELECT COALESCE(SUM(a.complexity), 0) FROM atoms a WHERE a.file_path = sf.path AND a.is_removed = 0) as totalComplexity`);
    selects.push(`(SELECT ROUND(AVG(a.fragility_score), 2) FROM atoms a WHERE a.file_path = sf.path AND a.is_removed = 0) as avgFragility`);
    selects.push(`(SELECT ROUND(MAX(a.propagation_score), 2) FROM atoms a WHERE a.file_path = sf.path AND a.is_removed = 0) as maxPropagation`);
  } else {
    selects.push(`0 as atomCount, 0 as totalComplexity, 0 as avgFragility, 0 as maxPropagation`);
  }

  const joins = hasRisk ? `LEFT JOIN risk_assessments ra ON ra.file_path = sf.path AND ra.is_removed = 0` : '';
  const sql = `SELECT ${selects.join(', ')} FROM system_files sf ${joins} WHERE sf.is_removed = 0 ORDER BY riskScore DESC LIMIT ?`;
  return safeAll(db, sql, [limit]);
}

function getDependencies() {
  const db = getMainDb();
  if (hasTable(db, 'file_dependencies')) {
    const deps = safeAll(db, `
      SELECT source_path as source, target_path as target,
        dependency_type as type, is_dynamic as isDynamic
      FROM file_dependencies WHERE is_removed = 0 AND dependency_type = 'local'
    `);
    if (deps.length > 0) return deps.map(r => ({ ...r, isDynamic: Boolean(r.isDynamic) }));
  }

  if (hasTable(db, 'atom_relations') && hasTable(db, 'atoms')) {
    return safeAll(db, `
      SELECT DISTINCT a1.file_path as source, a2.file_path as target, 'local' as type, 0 as isDynamic
      FROM atom_relations ar
      JOIN atoms a1 ON ar.source_id = a1.id
      JOIN atoms a2 ON ar.target_id = a2.id
      WHERE ar.is_removed = 0 AND a1.is_removed = 0 AND a2.is_removed = 0 
        AND a1.file_path != a2.file_path
    `);
  }
  return [];
}

function getAtomsForFile(filePath) {
  const db = getMainDb();
  if (!hasTable(db, 'atoms')) return [];
  return safeAll(db, `
    SELECT id, name, atom_type as type, file_path as filePath,
      line_start as lineStart, line_end as lineEnd,
      lines_of_code as linesOfCode, complexity,
      is_exported as isExported, is_async as isAsync,
      archetype_type as archetype,
      fragility_score as fragilityScore,
      coupling_score as couplingScore,
      propagation_score as propagationScore,
      centrality_classification as centralityClass,
      risk_level as riskLevel,
      in_degree as inDegree, out_degree as outDegree,
      callers_count as callersCount, callees_count as calleesCount,
      shared_state_json as sharedStateJson,
      event_emitters_json as eventEmittersJson,
      event_listeners_json as eventListenersJson,
      data_flow_json as dataFlowJson
    FROM atoms WHERE file_path = ? AND is_removed = 0 ORDER BY line_start
  `, [filePath]).map(r => {
    const parse = (str) => {
      try { return str ? JSON.parse(str) : []; } catch (e) { return []; }
    };
    return {
      ...r, 
      isExported: Boolean(r.isExported), 
      isAsync: Boolean(r.isAsync),
      fragilityScore: r.fragilityScore || 0, 
      couplingScore: r.couplingScore || 0,
      sharedState: parse(r.sharedStateJson),
      eventEmitters: parse(r.eventEmittersJson),
      eventListeners: parse(r.eventListenersJson),
      dataFlow: parse(r.dataFlowJson)
    };
  });
}

function getRelationsForFile(filePath) {
  const db = getMainDb();
  if (!hasTable(db, 'atom_relations') || !hasTable(db, 'atoms')) return [];
  // We want relations where EITHER source or target is in this file
  return safeAll(db, `
    SELECT 
      ar.source_id as sourceId, 
      ar.target_id as targetId,
      ar.relation_type as relationType, 
      ar.weight, 
      ar.line_number as lineNumber,
      a1.name as sourceName,
      a1.file_path as sourceFile,
      a2.name as targetName,
      a2.file_path as targetFile
    FROM atom_relations ar
    JOIN atoms a1 ON ar.source_id = a1.id
    JOIN atoms a2 ON ar.target_id = a2.id
    WHERE (a1.file_path = ? OR a2.file_path = ?) 
      AND ar.is_removed = 0 AND a1.is_removed = 0 AND a2.is_removed = 0
  `, [filePath, filePath]).map(r => ({ 
    ...r, 
    weight: r.weight || 1, 
    lineNumber: r.lineNumber || 0 
  }));
}

function getAtomHistory(symbolName, filePath, limit = 20) {
  const db = getHistoryDb();
  if (!db) return [];
  try {
    return safeAll(db, `
      SELECT * FROM atom_versions_archive 
      WHERE symbol_name = ? AND file_path LIKE ?
      ORDER BY archived_at DESC LIMIT ?
    `, [symbolName, `%${filePath}%`, limit]);
  } catch { return []; }
}

function getHealthSnapshots(limit = 50) {
  const db = getHealthDb();
  if (!db) return [];
  try {
    // Try different possible table names
    for (const table of ['health_snapshots', 'compiler_metrics_snapshots', 'snapshots']) {
      if (hasTable(db, table)) {
        return safeAll(db, `SELECT * FROM ${table} ORDER BY rowid DESC LIMIT ?`, [limit]);
      }
    }
    // List all tables
    return safeAll(db, `SELECT name FROM sqlite_master WHERE type='table'`);
  } catch { return []; }
}

function getRiskDistribution() {
  const db = getMainDb();
  if (!hasTable(db, 'risk_assessments')) return [];
  return safeAll(db, `
    SELECT risk_level as level, COUNT(*) as count, 
      ROUND(AVG(risk_score), 1) as avgScore
    FROM risk_assessments WHERE is_removed = 0 
    GROUP BY risk_level ORDER BY avgScore DESC
  `);
}

function getSocieties() {
  const db = getMainDb();
  if (!hasTable(db, 'societies')) return [];
  return safeAll(db, `SELECT * FROM societies ORDER BY cohesion_score DESC LIMIT 50`);
}

function getModules(limit = 100) {
  const db = getMainDb();
  if (!hasTable(db, 'modules')) return [];
  return safeAll(db, `SELECT * FROM modules ORDER BY name LIMIT ?`, [limit]);
}

function executeRawQuery(sql) {
  const db = getMainDb();
  // Safety: only allow SELECT
  if (!sql.trim().toUpperCase().startsWith('SELECT')) {
    return { error: 'Only SELECT queries allowed' };
  }
  try {
    return { rows: db.prepare(sql).all(), success: true };
  } catch (e) {
    return { error: e.message, success: false };
  }
}

// ── HTTP Server ────────────────────────────────────────────────────────

function findGlobalEvents(eventName, type = 'listeners') {
  const db = getMainDb();
  if (!hasTable(db, 'atoms')) return [];
  const field = type === 'listeners' ? 'event_listeners_json' : 'event_emitters_json';
  
  // Basic search: Find atoms where the event name is in the JSON field
  // Using LIKE for simplicity in SQLite, but we filter in JS for accuracy
  const rows = safeAll(db, `
    SELECT id, name, file_path as filePath, ${field} as eventsJson
    FROM atoms 
    WHERE ${field} LIKE ? AND is_removed = 0
  `, [`%${eventName}%`]);

  return rows.filter(r => {
    try {
      const events = JSON.parse(r.eventsJson || '[]');
      return events.some(e => e.eventName === eventName);
    } catch { return false; }
  });
}

const ROUTES = {
  '/api/stats': () => getStats(),
  '/api/files': (_, url) => getFiles(parseInt(url.searchParams.get('limit') || '5000')),
  '/api/dependencies': () => getDependencies(),
  '/api/risk': () => getRiskDistribution(),
  '/api/societies': () => getSocieties(),
  '/api/modules': (_, url) => getModules(parseInt(url.searchParams.get('limit') || '100')),
  '/api/health-snapshots': (_, url) => getHealthSnapshots(parseInt(url.searchParams.get('limit') || '50')),
  '/api/events/global': (_, url) => {
    const name = url.searchParams.get('name');
    const type = url.searchParams.get('type') || 'listeners';
    return findGlobalEvents(name, type);
  },
  '/api/search/all': (_, url) => {
    const q = url.searchParams.get('q') || '';
    if (!q) return [];
    const db = getMainDb();
    const files = safeAll(db, `SELECT path, display_path as displayPath, 'file' as type FROM system_files WHERE path LIKE ? AND is_removed = 0 LIMIT 10`, [`%${q}%`]);
    const atoms = safeAll(db, `SELECT name, file_path as filePath, atom_type as type, 'atom' as resultType FROM atoms WHERE name LIKE ? AND is_removed = 0 LIMIT 20`, [`%${q}%`]);
    return [...files.map(f => ({ ...f, resultType: 'file' })), ...atoms];
  },
  '/api/code/snippet': async (_, url) => {
    const filePath = url.searchParams.get('path');
    const start = parseInt(url.searchParams.get('start') || '0');
    const end = parseInt(url.searchParams.get('end') || '0');
    if (!filePath) return { error: 'No path' };
    
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      return { snippet: lines.slice(start - 1, end).join('\n') };
    } catch (e) {
      return { error: e.message };
    }
  }
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const json = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  try {
    // Static routes
    if (ROUTES[path]) {
      const t = Date.now();
      const data = ROUTES[path](req, url);
      console.log(`[db-api] ${path} → ${Array.isArray(data) ? data.length + ' rows' : 'object'} (${Date.now() - t}ms)`);
      return json(data);
    }

    // /api/atoms/:filePath
    if (path.startsWith('/api/atoms/')) {
      const filePath = decodeURIComponent(path.slice('/api/atoms/'.length));
      const t = Date.now();
      const atoms = getAtomsForFile(filePath);
      console.log(`[db-api] atoms for ${filePath} → ${atoms.length} (${Date.now() - t}ms)`);
      return json(atoms);
    }

    // /api/relations/:filePath
    if (path.startsWith('/api/relations/')) {
      const filePath = decodeURIComponent(path.slice('/api/relations/'.length));
      const t = Date.now();
      const rels = getRelationsForFile(filePath);
      console.log(`[db-api] relations for ${filePath} → ${rels.length} (${Date.now() - t}ms)`);
      return json(rels);
    }

    // /api/atom-history/:symbol?file=path
    if (path.startsWith('/api/atom-history/')) {
      const symbol = decodeURIComponent(path.slice('/api/atom-history/'.length));
      const file = url.searchParams.get('file') || '';
      return json(getAtomHistory(symbol, file));
    }

    // /api/query - raw SQL (dev only)
    if (path === '/api/query' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const { sql } = JSON.parse(body);
          return json(executeRawQuery(sql));
        } catch (e) { return json({ error: e.message }, 400); }
      });
      return;
    }

    // /api/tables - list all tables
    if (path === '/api/tables') {
      const db = getMainDb();
      const tables = safeAll(db, `SELECT name, (SELECT COUNT(*) FROM pragma_table_info(name)) as columns FROM sqlite_master WHERE type='table' ORDER BY name`);
      return json(tables);
    }

    json({ error: 'Not found', path }, 404);
  } catch (e) {
    console.error(`[db-api] Error:`, e);
    json({ error: e.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 OmnySystem DB API running at http://localhost:${PORT}`);
  console.log(`   DB path: ${DATA_DIR}`);
  console.log(`   Endpoints: /api/stats, /api/files, /api/atoms/:path, /api/relations/:path`);
  console.log(`              /api/dependencies, /api/risk, /api/societies, /api/modules`);
  console.log(`              /api/health-snapshots, /api/atom-history/:symbol`);
  console.log(`              /api/tables, POST /api/query\n`);
});
