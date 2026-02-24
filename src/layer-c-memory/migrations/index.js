/**
 * @fileoverview Database migrations
 * 
 * Se ejecuta automáticamente al inicio para asegurar que la DB
 * tenga los campos y datos correctos.
 * 
 * @module layer-c-memory/migrations
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = '.omnysysdata/omnysys.db';

const MIGRATIONS = [
  {
    name: 'add_error_handling_columns',
    check: () => {
      const db = new Database(DB_PATH, { readonly: true });
      const cols = db.prepare('PRAGMA table_info(atoms)').all();
      db.close();
      return cols.some(c => c.name === 'has_error_handling');
    },
    run: () => {
      const db = new Database(DB_PATH);
      try {
        db.exec('ALTER TABLE atoms ADD COLUMN has_error_handling INTEGER DEFAULT 0');
        db.exec('ALTER TABLE atoms ADD COLUMN has_network_calls INTEGER DEFAULT 0');
        console.log('✅ Migration: added error_handling columns');
      } catch (e) {
        // Columnas ya existen
      }
      db.close();
    }
  },
  {
    name: 'fix_purpose_object_bug',
    check: () => {
      const db = new Database(DB_PATH, { readonly: true });
      const count = db.prepare("SELECT COUNT(*) as c FROM atoms WHERE purpose_type = '[object Object]'").get();
      db.close();
      return count.c === 0;
    },
    run: () => {
      const db = new Database(DB_PATH);
      db.prepare("UPDATE atoms SET purpose_type = 'UNKNOWN' WHERE purpose_type = '[object Object]'").run();
      const count = db.prepare("SELECT changes() as c").get();
      console.log(`✅ Migration: fixed ${count.c} purpose_object bugs`);
      db.close();
    }
  },
  {
    name: 'recalculate_error_handling',
    check: () => {
      const db = new Database(DB_PATH, { readonly: true });
      const withError = db.prepare('SELECT COUNT(*) as c FROM atoms WHERE has_error_handling = 1').get();
      db.close();
      return withError.c > 100; // Si ya hay >100 con error handling, está migrado
    },
    run: () => {
      const db = new Database(DB_PATH);
      const atoms = db.prepare('SELECT id, file_path, line_start, line_end FROM atoms WHERE file_path IS NOT NULL').all();
      
      const patterns = [/try\s*\{/, /catch\s*\(/, /\.catch\s*\(/, /if\s*\(.*\)\s*throw/, /Promise\.catch/];
      const update = db.prepare('UPDATE atoms SET has_error_handling = 1 WHERE id = ?');
      
      let updated = 0;
      for (const atom of atoms) {
        try {
          if (!atom.file_path || !fs.existsSync(atom.file_path)) continue;
          const content = fs.readFileSync(atom.file_path, 'utf-8');
          const lines = content.split('\n');
          const start = Math.max(0, (atom.line_start || 1) - 1);
          const end = Math.min(lines.length, atom.line_end || start + 50);
          const code = lines.slice(start, end).join('\n');
          
          if (patterns.some(p => p.test(code))) {
            update.run(atom.id);
            updated++;
          }
        } catch (e) {}
      }
      
      console.log(`✅ Migration: recalculated error_handling for ${updated} atoms`);
      db.close();
    }
  }
];

/**
 * Ejecuta todas las migraciones pendientes
 */
export async function runMigrations() {
  console.log('\n🔄 Checking database migrations...\n');
  
  for (const migration of MIGRATIONS) {
    try {
      if (!migration.check()) {
        console.log(`  📦 Running migration: ${migration.name}`);
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

export default { runMigrations };
