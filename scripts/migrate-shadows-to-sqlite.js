/**
 * @fileoverview migrate-shadows-to-sqlite.js
 * 
 * Migra los shadows JSON legacy a la tabla atom_events en SQLite
 * Esto permite queries sobre el historial de evolución de átomos
 * 
 * @usage: node scripts/migrate-shadows-to-sqlite.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OMNYSYS_DATA = path.join(__dirname, '..', '.omnysysdata');
const SHADOWS_DIR = path.join(OMNYSYS_DATA, 'shadows');

async function migrate() {
  console.log('🔄 Migrating shadows to SQLite...\n');
  
  const files = await fs.readdir(SHADOWS_DIR);
  const jsonFiles = files.filter(f => f.startsWith('shadow_') && f.endsWith('.json'));
  
  console.log(`Found ${jsonFiles.length} shadow files\n`);
  
  // Dynamic import for SQLite
  const { default: Database } = await import('better-sqlite3');
  const dbPath = path.join(OMNYSYS_DATA, 'omnysys.db');
  const db = new Database(dbPath);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(SHADOWS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const shadow = JSON.parse(content);
      
      // Check if already exists in atom_events
      const existing = db.prepare(
        'SELECT id FROM atom_events WHERE atom_id = ? AND event_type = ?'
      ).get(shadow.originalId, 'deleted');
      
      if (existing) {
        console.log(`⏭️  Skipped (already exists): ${shadow.originalId}`);
        skipped++;
        continue;
      }
      
      // Insert into atom_events
      db.prepare(`
        INSERT INTO atom_events (
          atom_id, event_type, changed_fields, before_state, after_state,
          impact_score, timestamp, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        shadow.originalId,
        'deleted',
        JSON.stringify(shadow.lineage || {}),
        null,
        JSON.stringify(shadow),
        shadow.inheritance?.vibrationScore || 0,
        shadow.diedAt || shadow.bornAt || new Date().toISOString(),
        'migration_from_json'
      );
      
      console.log(`✅ Migrated: ${shadow.originalId}`);
      migrated++;
    } catch (error) {
      console.log(`❌ Error: ${file} - ${error.message}`);
    }
  }
  
  db.close();
  
  console.log(`\n📊 Migration complete:`);
  console.log(`   - Migrated: ${migrated}`);
  console.log(`   - Skipped: ${skipped}`);
  console.log(`   - Total: ${migrated + skipped}`);
  
  // Verify
  const db2 = new Database(dbPath);
  const count = db2.prepare('SELECT COUNT(*) as count FROM atom_events').get();
  console.log(`\n📈 atom_events now has ${count.count} records`);
  db2.close();
}

migrate().catch(console.error);
