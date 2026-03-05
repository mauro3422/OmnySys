import { DatabaseOptions } from './src/layer-c-memory/storage/database/config.js';
import Database from 'better-sqlite3';
import path from 'path';

function testDb() {
    const dbPath = path.join(process.cwd(), '.omnysysdata', 'omnysys.db');
    console.log('Opening DB at:', dbPath);
    const db = new Database(dbPath, DatabaseOptions);

    const stmt = db.prepare('SELECT id, shared_state_json FROM atoms WHERE shared_state_json IS NOT NULL AND shared_state_json != "[]" LIMIT 5');
    const rows = stmt.all();

    console.log(`Found ${rows.length} atoms with shared_state_json`);
    for (const r of rows) {
        console.log(r.id, r.shared_state_json);
    }
}

testDb();
