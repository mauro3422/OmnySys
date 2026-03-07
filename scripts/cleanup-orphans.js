/**
 * @fileoverview cleanup-orphans.js
 * 
 * 🧹 Database Janitor - Removes orphaned records and optimizes SQLite.
 * Addresses the 'Grade: F' health issue by purging removed atoms and relations.
 * 
 * Usage: node scripts/cleanup-orphans.js
 */

import { getDatabase, initializeStorage, closeStorage } from '../src/layer-c-memory/storage/database/connection.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

async function main() {
    console.log('\n🧹 OmnySys Database Cleanup');
    console.log('═'.repeat(50));

    try {
        const db = initializeStorage(ROOT_PATH);

        console.log('1. Analyzing current state...');
        const initialStats = db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM atoms WHERE is_removed = 1) as removed_atoms,
                (SELECT COUNT(*) FROM atom_relations WHERE is_removed = 1) as removed_relations,
                (SELECT COUNT(*) FROM atoms a LEFT JOIN files f ON a.file_path = f.path WHERE f.path IS NULL) as orphaned_atoms
        `).get();

        console.log(`   - Atoms marked for removal: ${initialStats.removed_atoms}`);
        console.log(`   - Relations marked for removal: ${initialStats.removed_relations}`);
        console.log(`   - Orphaned atoms (no file): ${initialStats.orphaned_atoms}`);

        console.log('\n2. Executing purge...');

        // Use a transaction for safety and speed
        db.transaction(() => {
            // Delete removed relations first (integrity)
            const relResult = db.prepare("DELETE FROM atom_relations WHERE is_removed = 1").run();
            console.log(`   ✅ Purged ${relResult.changes} removed relations`);

            // Delete orphaned relations (where source or target is gone)
            const relOrphanResult = db.prepare(`
                DELETE FROM atom_relations 
                WHERE source_id NOT IN (SELECT id FROM atoms)
                OR target_id NOT IN (SELECT id FROM atoms)
            `).run();
            console.log(`   ✅ Purged ${relOrphanResult.changes} orphaned relations`);

            // Delete removed atoms
            const atomResult = db.prepare("DELETE FROM atoms WHERE is_removed = 1").run();
            console.log(`   ✅ Purged ${atomResult.changes} removed atoms`);

            // Delete orphaned atoms
            const atomOrphanResult = db.prepare(`
                DELETE FROM atoms 
                WHERE file_path NOT IN (SELECT path FROM files)
            `).run();
            console.log(`   ✅ Purged ${atomOrphanResult.changes} orphaned atoms`);

            // Delete removed files
            const fileResult = db.prepare("DELETE FROM files WHERE is_removed = 1").run();
            console.log(`   ✅ Purged ${fileResult.changes} removed files`);
        })();

        console.log('\n3. Optimizing database...');
        console.log('   (Executing VACUUM - this might take a moment)');
        db.exec("VACUUM");
        db.exec("ANALYZE");
        console.log('   ✅ Optimization complete');

        const finalStats = db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM atoms) as atoms,
                (SELECT COUNT(*) FROM atom_relations) as relations,
                (SELECT COUNT(*) FROM files) as files
        `).get();

        console.log('\n✨ Database healthy');
        console.log(`   - Total Atoms: ${finalStats.atoms}`);
        console.log(`   - Total Relations: ${finalStats.relations}`);
        console.log(`   - Total Files: ${finalStats.files}`);
        console.log('═'.repeat(50));

    } catch (error) {
        console.error(`\n❌ Cleanup failed: ${error.message}`);
    } finally {
        closeStorage();
    }
}

main().catch(console.error);
