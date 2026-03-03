/**
 * @fileoverview BaseSqlRepository.js
 * 
 * Clase base abstracta para todos los repositorios basados en SQLite.
 * Centraliza la creación de tablas, manejo de transacciones y operaciones CRUD básicas.
 */

import { createLogger } from '#utils/logger.js';

export class BaseSqlRepository {
    constructor(db, namespace) {
        if (!db) throw new Error('Database instance is required');
        this.db = db;
        this.logger = createLogger(`OmnySys:Storage:${namespace || 'BaseSql'}`);
        this.statements = new Map();
    }

    /**
     * Asegura que una tabla existe con el esquema dado.
     */
    ensureTable(tableName, schema) {
        try {
            this.db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`);
            this.logger.debug(`Table ensured: ${tableName}`);
        } catch (err) {
            this.logger.error(`Failed to ensure table ${tableName}: ${err.message}`);
            throw err;
        }
    }

    /**
     * Prepara y cachea un statement de SQLite.
     */
    prepare(name, sql) {
        if (this.statements.has(name)) return this.statements.get(name);
        const stmt = this.db.prepare(sql);
        this.statements.set(name, stmt);
        return stmt;
    }

    /**
     * Ejecuta una operación atómica dentro de una transacción.
     */
    transaction(fn) {
        return this.db.transaction(fn);
    }

    /**
     * Helpers genéricos de borrado.
     */
    delete(tableName, keyColumn, value) {
        const sql = `DELETE FROM ${tableName} WHERE ${keyColumn} = ?`;
        return this.db.prepare(sql).run(value);
    }

    /**
     * Borra registros basado en un patrón (LIKE).
     */
    deleteByPattern(tableName, keyColumn, pattern) {
        const sql = `DELETE FROM ${tableName} WHERE ${keyColumn} LIKE ?`;
        return this.db.prepare(sql).run(pattern);
    }

    /**
     * Limpia una tabla completa.
     */
    clearTable(tableName) {
        return this.db.prepare(`DELETE FROM ${tableName}`).run();
    }
}
