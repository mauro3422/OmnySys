/**
 * SqliteReader — Direct SQLite access via sql.js (WASM)
 * 
 * Reads omnysys.db directly from disk using sql.js (SQLite compiled to WASM).
 * No native modules — works in any VS Code/Electron environment.
 * 
 * Watches the DB file for changes to detect desynchronization
 * between the live DB and what the extension has cached.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FileInfo {
  path: string;
  displayPath: string;
  riskScore: number;
  riskLevel: string;
  culture: string;
  atomCount: number;
  totalComplexity: number;
}

export interface FileDependency {
  source: string;
  target: string;
  type: string;
  isDynamic: boolean;
}

export interface AtomInfo {
  id: string;
  name: string;
  type: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  linesOfCode: number;
  complexity: number;
  isExported: boolean;
  isAsync: boolean;
  archetype: string;
  fragilityScore: number;
  couplingScore: number;
  propagationScore: number;
  centralityClass: string;
  riskLevel: string;
  inDegree: number;
  outDegree: number;
  callersCount: number;
  calleesCount: number;
}

export interface AtomRelation {
  sourceId: string;
  targetId: string;
  relationType: string;
  weight: number;
  lineNumber: number;
}

export interface DbStats {
  totalAtoms: number;
  totalFiles: number;
  totalRelations: number;
  totalEvents: number;
  avgComplexity: number;
  maxComplexity: number;
}

export class SqliteReader {
  private db: any = null;
  private SQL: any = null;
  private dbPath: string;
  private lastModified: number = 0;
  private _tables: Set<string> = new Set();
  private watcher: fs.FSWatcher | null = null;
  private onChangeCallback: (() => void) | null = null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /** Initialize sql.js WASM and open database */
  async init(): Promise<boolean> {
    try {
      const initSqlJs = require('sql.js');

      // Load WASM binary explicitly — esbuild doesn't handle WASM auto-location
      const wasmPath = path.join(__dirname, 'sql-wasm.wasm');
      let wasmBinary: Buffer | undefined;
      if (fs.existsSync(wasmPath)) {
        wasmBinary = fs.readFileSync(wasmPath);
        console.log('[SqliteReader] WASM loaded from:', wasmPath);
      } else {
        // Fallback: try node_modules path (dev mode)
        const nmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
        if (fs.existsSync(nmPath)) {
          wasmBinary = fs.readFileSync(nmPath);
          console.log('[SqliteReader] WASM loaded from node_modules');
        }
      }

      this.SQL = await initSqlJs(wasmBinary ? { wasmBinary } : undefined);
      this._loadDb();
      this._watchDb();
      return true;
    } catch (err: any) {
      console.error('[SqliteReader] Init FAILED:', err.message, err.stack);
      return false;
    }
  }

  /** Register callback for DB change notifications */
  onDbChange(callback: () => void) {
    this.onChangeCallback = callback;
  }

  /** Reload DB from disk (call after watcher detects change) */
  reload(): boolean {
    try {
      this._loadDb();
      return true;
    } catch (err: any) {
      console.error('[SqliteReader] Reload failed:', err.message);
      return false;
    }
  }

  /** Check if DB was modified on disk since last load */
  isStale(): boolean {
    try {
      const stat = fs.statSync(this.dbPath);
      return stat.mtimeMs > this.lastModified;
    } catch {
      return false;
    }
  }

  close() {
    try {
      if (this.watcher) { this.watcher.close(); this.watcher = null; }
      if (this.db) { this.db.close(); this.db = null; }
    } catch {}
  }

  // ── Queries ───────────────────────────────────────────

  getStats(): DbStats {
    this._ensureDb();

    // Discover available tables first
    const tables = new Set(
      this._getAll(`SELECT name FROM sqlite_master WHERE type='table'`).map(r => r.name)
    );

    const safe = (table: string, query: string, fallback: number = 0): number => {
      if (!tables.has(table)) return fallback;
      try {
        const row = this._getOne(query);
        return Object.values(row)[0] as number || fallback;
      } catch { return fallback; }
    };

    return {
      totalAtoms: safe('atoms', `SELECT COUNT(*) as n FROM atoms WHERE is_removed = 0`),
      totalFiles: safe('system_files', `SELECT COUNT(*) as n FROM system_files WHERE is_removed = 0`),
      totalRelations: safe('atom_relations', `SELECT COUNT(*) as n FROM atom_relations WHERE is_removed = 0`),
      totalEvents: safe('watcher_issues', `SELECT COUNT(*) as n FROM watcher_issues`) 
                || safe('events', `SELECT COUNT(*) as n FROM events`),
      avgComplexity: safe('atoms', `SELECT ROUND(AVG(complexity), 2) as n FROM atoms WHERE is_removed = 0`),
      maxComplexity: safe('atoms', `SELECT MAX(complexity) as n FROM atoms WHERE is_removed = 0`)
    };
  }

  getFilesWithRisk(limit: number = 5000): FileInfo[] {
    this._ensureDb();
    if (!this._hasTable('system_files')) return [];
    try {
      const hasRisk = this._hasTable('risk_assessments');
      const hasAtoms = this._hasTable('atoms');
      const riskJoin = hasRisk ? `LEFT JOIN risk_assessments ra ON ra.file_path = sf.path AND ra.is_removed = 0` : '';
      const riskSelect = hasRisk ? `COALESCE(ra.risk_score, sf.risk_score, 0)` : `COALESCE(sf.risk_score, 0)`;
      const riskLevel = hasRisk ? `COALESCE(ra.risk_level, 'low')` : `'low'`;
      const atomCount = hasAtoms ? `(SELECT COUNT(*) FROM atoms a WHERE a.file_path = sf.path AND a.is_removed = 0)` : `0`;
      const complexity = hasAtoms ? `(SELECT COALESCE(SUM(a.complexity), 0) FROM atoms a WHERE a.file_path = sf.path AND a.is_removed = 0)` : `0`;

      return this._getAll(`
        SELECT sf.path, sf.display_path as displayPath,
          ${riskSelect} as riskScore, ${riskLevel} as riskLevel,
          COALESCE(sf.culture, 'unknown') as culture,
          ${atomCount} as atomCount, ${complexity} as totalComplexity
        FROM system_files sf ${riskJoin}
        WHERE sf.is_removed = 0 ORDER BY riskScore DESC LIMIT ?
      `, [limit]).map(r => ({
        path: r.path, displayPath: r.displayPath || r.path,
        riskScore: r.riskScore || 0, riskLevel: r.riskLevel || 'low',
        culture: r.culture || 'unknown', atomCount: r.atomCount || 0, totalComplexity: r.totalComplexity || 0
      }));
    } catch (err: any) {
      console.error('[SqliteReader] getFilesWithRisk error:', err.message);
      return [];
    }
  }

  getFileDependencies(): FileDependency[] {
    this._ensureDb();
    try {
      if (this._hasTable('file_dependencies')) {
        const deps = this._getAll(`
          SELECT source_path as source, target_path as target,
            dependency_type as type, is_dynamic as isDynamic
          FROM file_dependencies WHERE is_removed = 0 AND dependency_type = 'local'
        `);
        if (deps.length > 0) {
          return deps.map(r => ({
            source: r.source, target: r.target,
            type: r.type || 'local', isDynamic: Boolean(r.isDynamic)
          }));
        }
      }

      // Fallback: Infer from atom_relations
      if (this._hasTable('atom_relations') && this._hasTable('atoms')) {
        return this._getAll(`
          SELECT DISTINCT a1.file_path as source, a2.file_path as target, 'local' as type, 0 as isDynamic
          FROM atom_relations ar
          JOIN atoms a1 ON ar.source_id = a1.id
          JOIN atoms a2 ON ar.target_id = a2.id
          WHERE ar.is_removed = 0 AND a1.is_removed = 0 AND a2.is_removed = 0 
            AND a1.file_path != a2.file_path
        `).map(r => ({
          source: r.source, target: r.target,
          type: r.type, isDynamic: Boolean(r.isDynamic)
        }));
      }

      return [];
    } catch (err: any) {
      console.error('[SqliteReader] getFileDependencies error:', err.message);
      return [];
    }
  }

  getAtomsForFile(filePath: string): AtomInfo[] {
    this._ensureDb();
    if (!this._hasTable('atoms')) return [];
    try {
      return this._getAll(`
        SELECT 
          id, name, atom_type as type, file_path as filePath,
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
          callers_count as callersCount, callees_count as calleesCount
        FROM atoms 
        WHERE file_path = ? AND is_removed = 0
        ORDER BY line_start
      `, [filePath]).map(r => ({
        ...r,
        isExported: Boolean(r.isExported),
        isAsync: Boolean(r.isAsync),
        fragilityScore: r.fragilityScore || 0,
        couplingScore: r.couplingScore || 0,
        propagationScore: r.propagationScore || 0
      }));
    } catch (err: any) {
      console.error('[SqliteReader] getAtomsForFile error:', err.message);
      return [];
    }
  }

  getRelationsForFile(filePath: string): AtomRelation[] {
    this._ensureDb();
    if (!this._hasTable('atom_relations') || !this._hasTable('atoms')) return [];
    try {
      return this._getAll(`
        SELECT 
          ar.source_id as sourceId, ar.target_id as targetId,
          ar.relation_type as relationType, ar.weight, ar.line_number as lineNumber
        FROM atom_relations ar
        JOIN atoms a1 ON ar.source_id = a1.id AND a1.is_removed = 0
        WHERE a1.file_path = ? AND ar.is_removed = 0
      `, [filePath]).map(r => ({
        sourceId: r.sourceId,
        targetId: r.targetId,
        relationType: r.relationType,
        weight: r.weight || 1,
        lineNumber: r.lineNumber || 0
      }));
    } catch (err: any) {
      console.error('[SqliteReader] getRelationsForFile error:', err.message);
      return [];
    }
  }

  // ── Sync Check ────────────────────────────────────────

  /** Compare DB row count vs MCP health to detect desync */
  getSyncInfo(): { dbAtoms: number; dbFiles: number; lastModified: Date } {
    this._ensureDb();
    const stats = this.getStats();
    return {
      dbAtoms: stats.totalAtoms,
      dbFiles: stats.totalFiles,
      lastModified: new Date(this.lastModified)
    };
  }

  // ── Internal ──────────────────────────────────────────

  private _loadDb() {
    const buffer = fs.readFileSync(this.dbPath);
    const stat = fs.statSync(this.dbPath);
    this.lastModified = stat.mtimeMs;

    if (this.db) {
      try { this.db.close(); } catch {}
    }
    this.db = new this.SQL.Database(new Uint8Array(buffer));

    // Discover tables
    this._tables = new Set(
      this._getAll(`SELECT name FROM sqlite_master WHERE type='table'`).map(r => r.name)
    );
    console.log(`[SqliteReader] Loaded DB: ${this.dbPath} (${(buffer.length / 1024 / 1024).toFixed(1)}MB, ${this._tables.size} tables: ${[...this._tables].join(', ')})`);
  }

  private _watchDb() {
    try {
      let debounce: ReturnType<typeof setTimeout> | null = null;
      this.watcher = fs.watch(this.dbPath, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
          console.log('[SqliteReader] DB changed on disk, reloading...');
          this.reload();
          if (this.onChangeCallback) this.onChangeCallback();
        }, 2000); // 2s debounce — DB writes can be frequent
      });
    } catch (err: any) {
      console.warn('[SqliteReader] Cannot watch DB:', err.message);
    }
  }

  private _ensureDb() {
    if (!this.db) throw new Error('Database not initialized. Call init() first.');
  }

  private _hasTable(name: string): boolean {
    return this._tables.has(name);
  }

  private _getOne(sql: string, params: any[] = []): any {
    const stmt = this.db.prepare(sql);
    if (params.length) stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return {};
  }

  private _getAll(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }
}
