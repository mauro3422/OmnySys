import * as fs from 'fs';
import * as path from 'path';

export class SqliteEngine {
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

      const wasmPath = path.join(__dirname, '..', 'sql-wasm.wasm');
      let wasmBinary: Buffer | undefined;

      if (fs.existsSync(wasmPath)) {
        wasmBinary = fs.readFileSync(wasmPath);
        console.log('[SqliteEngine] WASM loaded from:', wasmPath);
      } else {
        const nmPath = path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
        if (fs.existsSync(nmPath)) {
          wasmBinary = fs.readFileSync(nmPath);
          console.log('[SqliteEngine] WASM loaded from node_modules');
        }
      }

      this.SQL = await initSqlJs(wasmBinary ? { wasmBinary } : undefined);
      this._loadDb();
      this._watchDb();
      return true;
    } catch (err: any) {
      console.error('[SqliteEngine] Init FAILED:', err.message, err.stack);
      return false;
    }
  }

  onDbChange(callback: () => void) {
    this.onChangeCallback = callback;
  }

  reload(): boolean {
    try {
      this._loadDb();
      return true;
    } catch (err: any) {
      console.error('[SqliteEngine] Reload failed:', err.message);
      return false;
    }
  }

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

  // ── Adapters ───────────────────────────────────────────

  hasTable(name: string): boolean {
    return this._tables.has(name);
  }

  getOne(sql: string, params: any[] = []): any {
    this.ensureDb();
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

  getAll(sql: string, params: any[] = []): any[] {
    this.ensureDb();
    const stmt = this.db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
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

    this._tables = new Set(
      this.getAll(`SELECT name FROM sqlite_master WHERE type='table'`).map(r => r.name)
    );
    console.log(`[SqliteEngine] Loaded DB: ${this.dbPath} (${(buffer.length / 1024 / 1024).toFixed(1)}MB, ${this._tables.size} tables)`);
  }

  private _watchDb() {
    try {
      let debounce: ReturnType<typeof setTimeout> | null = null;
      this.watcher = fs.watch(this.dbPath, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
          console.log('[SqliteEngine] DB changed on disk, reloading...');
          this.reload();
          if (this.onChangeCallback) this.onChangeCallback();
        }, 2000);
      });
    } catch (err: any) {
      console.warn('[SqliteEngine] Cannot watch DB:', err.message);
    }
  }

  private ensureDb() {
    if (!this.db) throw new Error('Database not initialized. Call init() first.');
  }
}
