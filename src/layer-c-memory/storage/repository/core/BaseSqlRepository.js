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
     * Realiza un UPSERT genérico.
     */
    upsert(tableName, columns, values, conflictColumn) {
        const placeholders = columns.map(() => '?').join(', ');
        const updates = columns
            .filter(c => c !== conflictColumn)
            .map(c => `${c} = excluded.${c}`)
            .join(', ');

        const sql = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT(${conflictColumn}) DO UPDATE SET ${updates}
        `;
        return this.prepare(`upsert_${tableName}`, sql).run(...values);
    }

    /**
     * Limpia una tabla completa.
     */
    clearTable(tableName) {
        return this.prepare(`clear_${tableName}`, `DELETE FROM ${tableName}`).run();
    }

    /**
     * Carga filas de una tabla usando un mapeador opcional.
     */
    loadTableRows(tableName, filter = '1=1', params = [], mapper = null) {
        const sql = `SELECT * FROM ${tableName} WHERE ${filter}`;
        const rows = this.db.prepare(sql).all(...params);
        return mapper ? rows.map(mapper) : rows;
    }

    /**
     * Guarda múltiples filas en una tabla usando UPSERT.
     */
    saveTableRows(tableName, columns, items, conflictColumn) {
        if (!items || items.length === 0) return { changes: 0 };

        const placeholders = columns.map(() => '?').join(', ');
        const updates = columns
            .filter(c => c !== conflictColumn)
            .map(c => `${c} = excluded.${c}`)
            .join(', ');

        const sql = conflictColumn
            ? `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT(${conflictColumn}) DO UPDATE SET ${updates}
        `
            : `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
        `;

        const stmt = this.prepare(`upsert_batch_${tableName}`, sql);

        return this.transaction(() => {
            let changes = 0;
            for (const item of items) {
                const values = columns.map(col => item[col]);
                const result = stmt.run(...values);
                changes += result.changes;
            }
            return { changes };
        });
    }
}
