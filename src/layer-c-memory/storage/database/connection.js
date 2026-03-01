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
import { getRegisteredTables, getTableDefinition, detectMissingColumns, generateAddColumnSQL, generateCreateTableSQL, generateCreateIndexesSQL } from './schema-registry.js';

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
   * 
   * Usa schema-registry.js como SINGLE SOURCE OF TRUTH
   * Detecta y migra automáticamente columnas faltantes
   */
  initializeSchema() {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      
      // ── STEP 1: Leer schema.sql base (para tablas básicas) ───────────────
      const schemaPath = resolve(__dirname, 'schema.sql');
      if (existsSync(schemaPath)) {
        const schema = readFileSync(schemaPath, 'utf8');
        this.db.exec(schema);
        logger.debug('[Connection] Base schema.sql executed');
      }
      
      // ── STEP 2: Usar schema-registry como SSOT ───────────────────────────
      // Crear tablas registradas que puedan faltar en schema.sql
      const registeredTables = getRegisteredTables();
      
      for (const tableName of registeredTables) {
        // Verificar si la tabla existe
        const tableExists = this.db.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(tableName);
        
        if (!tableExists) {
          // Crear tabla desde registry
          const createSQL = generateCreateTableSQL(tableName);
          this.db.exec(createSQL);
          logger.info(`[Connection] Created table '${tableName}' from registry`);
        }
        
        // Crear índices
        const indexes = generateCreateIndexesSQL(tableName);
        for (const indexSQL of indexes) {
          this.db.exec(indexSQL);
        }
        
        // ── STEP 3: Detectar y agregar columnas faltantes ─────────────────
        const existingColumns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        const missingColumns = detectMissingColumns(tableName, existingColumns);
        
        if (missingColumns.length > 0) {
          logger.info(`[Connection] Adding ${missingColumns.length} missing column(s) to '${tableName}': ${missingColumns.map(c => c.name).join(', ')}`);
          
          for (const column of missingColumns) {
            try {
              const addColumnSQL = generateAddColumnSQL(tableName, column.name);
              this.db.exec(addColumnSQL);
            } catch (err) {
              // Ignorar si la columna ya existe (race condition)
              if (!err.message.includes('duplicate column')) {
                logger.warn(`[Connection] Failed to add column ${column.name} to ${tableName}: ${err.message}`);
              }
            }
          }
        }
      }
      
      // ── STEP 4: Reporte de drift detection ──────────────────────────────
      this._checkSchemaDrift();
      
      logger.debug('[Connection] Schema initialization complete (registry-based)');
    } catch (error) {
      logger.error(`[Connection] Failed to initialize schema: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Detecta drift entre schema.sql y schema-registry
   * Advierte si hay columnas en schema.sql que no están en el registry
   */
  _checkSchemaDrift() {
    const registeredTables = getRegisteredTables();
    
    for (const tableName of registeredTables) {
      const existingColumns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
      const registeredColumns = getTableDefinition(tableName).columns;
      
      const existingNames = new Set(existingColumns.map(c => c.name));
      const registeredNames = new Set(registeredColumns.map(c => c.name));
      
      // Columnas que existen pero no están en el registry (drift)
      const driftColumns = [...existingNames].filter(name => !registeredNames.has(name));
      
      if (driftColumns.length > 0) {
        logger.warn(
          `[Connection] ⚠️  SCHEMA DRIFT detected in table '${tableName}': ${driftColumns.join(', ')}\n` +
          `   These columns exist in DB but not in schema-registry.js\n` +
          `   → Consider adding them to registry or removing from DB`
        );
      }
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