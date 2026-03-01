/**
 * @fileoverview Database migrations
 *
 * Sistema de migraciones basado en schema-registry.js
 *
 * IMPORTANTE: Este archivo ahora es solo para migraciones de DATOS,
 * no para migraciones de SCHEMA. El schema se gestiona automáticamente
 * desde schema-registry.js
 *
 * @module layer-c-memory/migrations
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getTableColumns, hasColumn } from '../storage/database/schema-registry.js';

const DB_PATH = '.omnysysdata/omnysys.db';

/**
 * Migraciones de DATOS (no de schema)
 * 
 * Cada migración tiene:
 * - name: identificador único
 * - check: función que retorna true si ya está migrado
 * - run: función que ejecuta la migración
 * - type: 'data' | 'fix' (no 'schema' porque eso es automático)
 */
const DATA_MIGRATIONS = [
  {
    name: 'fix_purpose_object_bug',
    type: 'fix',
    description: 'Corregir purpose_type = [object Object]',
    check: () => {
      try {
        const db = new Database(DB_PATH, { readonly: true });
        const count = db.prepare("SELECT COUNT(*) as c FROM atoms WHERE purpose_type = '[object Object]'").get();
        db.close();
        return count.c === 0;
      } catch {
        return true; // Si no existe la DB, no hace falta migrar
      }
    },
    run: () => {
      const db = new Database(DB_PATH);
      try {
        db.prepare("UPDATE atoms SET purpose_type = 'UNKNOWN' WHERE purpose_type = '[object Object]'").run();
        const count = db.prepare("SELECT changes() as c").get();
        console.log(`✅ Migration: fixed ${count.c} purpose_object bugs`);
      } finally {
        db.close();
      }
    }
  }
  // Agregar más migraciones de DATOS aquí (no de schema)
  // El schema se gestiona automáticamente desde schema-registry.js
];

/**
 * Ejecuta todas las migraciones pendientes
 */
export async function runMigrations() {
  console.log('\n🔄 Checking database migrations...\n');
  
  // Verificar que la DB exista
  if (!fs.existsSync(DB_PATH)) {
    console.log('  ℹ️  Database does not exist yet. Skipping migrations.');
    return;
  }

  for (const migration of DATA_MIGRATIONS) {
    try {
      if (!migration.check()) {
        console.log(`  📦 Running ${migration.type} migration: ${migration.name}`);
        console.log(`     Description: ${migration.description}`);
        migration.run();
      } else {
        console.log(`  ✅ ${migration.name}: up to date`);
      }
    } catch (e) {
      console.log(`  ⚠️  ${migration.name}: ${e.message}`);
    }
  }

  console.log('\n✅ Migrations complete\n');
}

/**
 * Obtiene el reporte de estado del schema
 * Útil para debugging y auditoría
 */
export function getSchemaStatus() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { status: 'missing', message: 'Database does not exist' };
    }
    
    const db = new Database(DB_PATH, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    db.close();
    
    const status = {
      status: 'ok',
      tables: tables.map(t => t.name),
      timestamp: new Date().toISOString()
    };
    
    return status;
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

export default { 
  runMigrations,
  getSchemaStatus,
  DATA_MIGRATIONS
};
