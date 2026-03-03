import { initializeStorage, getDatabase } from './src/layer-c-memory/storage/database/connection.js';
import path from 'path';

function run() {
    initializeStorage(path.resolve(process.cwd()));
    const db = getDatabase();

    const count = db.prepare("SELECT COUNT(*) as c FROM atoms WHERE atom_type = 'sql_query'").get();
    process.stdout.write('\n=== SQL ATOMS v3 ===\nTotal: ' + count.c + '\n\n');

    const allMeta = db.prepare("SELECT _meta_json FROM atoms WHERE atom_type='sql_query'").all();
    const opCount = {}, purposeCount = {};
    let withParent = 0, withPurpose = 0;

    for (const r of allMeta) {
        let m = {};
        try { m = JSON.parse(r._meta_json || '{}'); } catch (e) { }
        opCount[m.sql_operation || 'NULL'] = (opCount[m.sql_operation || 'NULL'] || 0) + 1;
        if (m.sql_purpose) { purposeCount[m.sql_purpose] = (purposeCount[m.sql_purpose] || 0) + 1; withPurpose++; }
        if (m.parent_atom_id) withParent++;
    }

    process.stdout.write('--- Operaciones ---\n');
    for (const [k, v] of Object.entries(opCount).sort((a, b) => b[1] - a[1])) process.stdout.write('  ' + k + ': ' + v + '\n');

    process.stdout.write('\n--- sql_purpose (semántica) ---\n');
    for (const [k, v] of Object.entries(purposeCount).sort((a, b) => b[1] - a[1])) process.stdout.write('  ' + k + ': ' + v + '\n');

    process.stdout.write('\n--- Completitud ---\n');
    process.stdout.write('  Con sql_purpose: ' + withPurpose + '/' + count.c + '\n');
    process.stdout.write('  Con parent_atom_id: ' + withParent + '/' + count.c + '\n');

    const relCount = db.prepare("SELECT COUNT(*) as c FROM atom_relations WHERE relation_type='executes_sql'").get();
    process.stdout.write('  executes_sql relations: ' + relCount.c + '\n');
}
run();
