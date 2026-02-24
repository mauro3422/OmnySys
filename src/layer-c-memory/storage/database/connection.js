/**
 * @fileoverview connection.js
 * 
 * SQLite Connection Manager para OmnySystem v2.0
 * Usa better-sqlite3 para mejor performance sincronico.
 * 
 * @module storage/database/connection
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '#utils/logger.js';
import { readFileSync, mkdirSync, existsSync } from 'fs';

const logger = createLogger('OmnySys:Storage:Connection');

/**
 * Connection Manager para SQLite
 * Implementa patron Singleton para mantener una sola conexion
 */
class ConnectionManager {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.dbPath = null;
  }

  /**
   * Inicializa la conexion a la base de datos
   * @param {string} projectPath - Ruta del proyecto
   * @returns {Database} Instancia de base de datos
   */
  initialize(projectPath) {
    if (this.initialized && this.db) {
      return this.db;
    }

    this.dbPath = resolve(projectPath, '.omnysysdata', 'omnysys.db');
    
    // Crear directorio si no existe
    const dataDir = resolve(projectPath, '.omnysysdata');
    if (!existsSync(dataDir)) {
      logger.info(`[Connection] Creating data directory: ${dataDir}`);
      mkdirSync(dataDir, { recursive: true });
    }
    
    logger.info(`[Connection] Initializing SQLite at: ${this.dbPath}`);

    try {
      // Abrir conexion con better-sqlite3 (sincronico)
      this.db = new Database(this.dbPath);
      
      // Aplicar configuraciones
      this.applyConfig();
      
      // Ejecutar schema
      this.initializeSchema();
      
      this.initialized = true;
      
      logger.info('[Connection] SQLite initialized successfully');
      
      return this.db;
    } catch (error) {
      logger.error(`[Connection] Failed to initialize SQLite: ${error.message}`);
      throw error;
    }
  }

  /**
   * Aplica configuraciones optimizadas de SQLite
   */
  applyConfig() {
    // WAL mode para mejor performance concurrente
    this.db.pragma('journal_mode = WAL');
    
    // Cache size: 64MB
    this.db.pragma('cache_size = 64000');
    
    // Synchronous: NORMAL (balance)
    this.db.pragma('synchronous = NORMAL');
    
    // Temp store: MEMORY
    this.db.pragma('temp_store = MEMORY');
    
    // Page size: 4096
    this.db.pragma('page_size = 4096');
    
    // Foreign keys: ON
    this.db.pragma('foreign_keys = ON');
    
    // Busy timeout: 5000ms
    this.db.pragma('busy_timeout = 5000');
    
    logger.debug('[Connection] SQLite config applied');
  }

  /**
   * Inicializa el schema de la base de datos
   */
  initializeSchema() {
    try {
      // Leer y ejecutar schema.sql (sync)
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const schemaPath = resolve(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      
      this.db.exec(schema);
      
      // Migración: agregar columnas faltantes a tabla 'files' si no existen
      // SQLite no soporta ADD COLUMN IF NOT EXISTS en versiones antiguas
      const tableInfo = this.db.prepare('PRAGMA table_info(files)').all();
      const existingColumns = tableInfo.map(col => col.name);
      
      if (!existingColumns.includes('module_name')) {
        this.db.exec('ALTER TABLE files ADD COLUMN module_name TEXT');
      }
      if (!existingColumns.includes('imports_json')) {
        this.db.exec("ALTER TABLE files ADD COLUMN imports_json TEXT DEFAULT '[]'");
      }
      if (!existingColumns.includes('exports_json')) {
        this.db.exec("ALTER TABLE files ADD COLUMN exports_json TEXT DEFAULT '[]'");
      }
      
      // Migración: agregar columnas faltantes a tabla 'atoms'
      const atomsInfo = this.db.prepare('PRAGMA table_info(atoms)').all();
      const atomColumns = atomsInfo.map(col => col.name);
      
      if (!atomColumns.includes('called_by_json')) {
        this.db.exec("ALTER TABLE atoms ADD COLUMN called_by_json TEXT DEFAULT '[]'");
      }
      if (!atomColumns.includes('function_type')) {
        this.db.exec("ALTER TABLE atoms ADD COLUMN function_type TEXT DEFAULT 'declaration'");
      }
      
      // Migración v2.2: columnas de Algebra de Grafos
      if (!atomColumns.includes('in_degree')) {
        this.db.exec("ALTER TABLE atoms ADD COLUMN in_degree INTEGER DEFAULT 0");
      }
      if (!atomColumns.includes('out_degree')) {
        this.db.exec("ALTER TABLE atoms ADD COLUMN out_degree INTEGER DEFAULT 0");
      }
      if (!atomColumns.includes('centrality_score')) {
        this.db.exec("ALTER TABLE atoms ADD COLUMN centrality_score REAL DEFAULT 0");
      }
      if (!atomColumns.includes('centrality_classification')) {
        this.db.exec("ALTER TABLE atoms ADD COLUMN centrality_classification TEXT");
      }
      if (!atomColumns.includes('risk_level')) {
        this.db.exec("ALTER TABLE atoms ADD COLUMN risk_level TEXT");
      }
      if (!atomColumns.includes('risk_prediction')) {
        this.db.exec("ALTER TABLE atoms ADD COLUMN risk_prediction TEXT");
      }
      
      // Migración v2.1: agregar tabla cache si no existe
      const cacheTableInfo = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cache_entries'").get();
      if (!cacheTableInfo) {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS cache_entries (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            expiry INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_cache_expiry ON cache_entries(expiry);
        `);
        logger.info('[Connection] Created cache_entries table');
      }
      
      logger.debug('[Connection] Schema initialized');
    } catch (error) {
      logger.error(`[Connection] Failed to initialize schema: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene la instancia de base de datos
   * @returns {Database} Instancia de better-sqlite3
   */
  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Ejecuta una transaccion
   * @param {Function} callback - Funcion a ejecutar dentro de la transaccion
   * @returns {any} Resultado de la transaccion
   */
  transaction(callback) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(callback);
    return transaction();
  }

  /**
   * Cierra la conexion a la base de datos
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      logger.info('[Connection] Database connection closed');
    }
  }

  /**
   * Verifica si la base de datos esta inicializada
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized && this.db !== null;
  }

  /**
   * Obtiene estadisticas de la base de datos
   * @returns {Object} Estadisticas
   */
  getStats() {
    if (!this.db) {
      return null;
    }

    const stats = {
      atoms: this.db.prepare('SELECT COUNT(*) as count FROM atoms').get(),
      relations: this.db.prepare('SELECT COUNT(*) as count FROM atom_relations').get(),
      files: this.db.prepare('SELECT COUNT(*) as count FROM files').get(),
      events: this.db.prepare('SELECT COUNT(*) as count FROM atom_events').get()
    };

    return {
      atoms: stats.atoms.count,
      relations: stats.relations.count,
      files: stats.files.count,
      events: stats.events.count
    };
  }

  /**
   * Fuerza checkpoint WAL para persistir datos
   * Útil después de bulk operations
   */
  checkpoint() {
    if (!this.db) return;
    
    try {
      this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      logger.debug('[Connection] WAL checkpoint executed');
    } catch (error) {
      logger.warn('[Connection] WAL checkpoint failed:', error.message);
    }
  }
}

// Exportar instancia singleton
export const connectionManager = new ConnectionManager();

// Exportar funcion de conveniencia
export function initializeStorage(projectPath) {
  return connectionManager.initialize(projectPath);
}

export function getDatabase() {
  return connectionManager.getDatabase();
}

export function closeStorage() {
  connectionManager.close();
}

export default connectionManager;