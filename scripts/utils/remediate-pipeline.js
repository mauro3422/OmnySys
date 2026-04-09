/**
 * @fileoverview remediate-pipeline.js
 * 
 * Pipeline Janitor: Targeted remediation of orphaned data.
 * Focuses on resolving the Grade F health score by purging relations
 * and issues that reference non-existent atoms.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { createLogger } from '../src/utils/logger.js';


const logger = createLogger('Janitor:Remediate');
const projectPath = process.cwd();
const dbPath = path.resolve(projectPath, '.omnysysdata', 'omnysys.db');


async function startupJanitor() {
    logger.info(`🧹 Starting Pipeline Remediation on ${dbPath}`);
    const db = new Database(dbPath);

    try {
        // 1. Audit orphaned relations (Source missing)
        const orphanedSource = db.prepare(`
            SELECT COUNT(*) as count FROM atom_relations 
            WHERE source_id NOT IN (SELECT id FROM atoms)
        `).get();

        // 2. Audit orphaned relations (Target missing)
        const orphanedTarget = db.prepare(`
            SELECT COUNT(*) as count FROM atom_relations 
            WHERE target_id NOT IN (SELECT id FROM atoms)
        `).get();

        const totalRelations = orphanedSource.count + orphanedTarget.count;
        logger.info(`🔍 Found ${totalRelations} orphaned relations.`);

        if (totalRelations > 0) {
            db.transaction(() => {
                const delSource = db.prepare(`
                    DELETE FROM atom_relations 
                    WHERE source_id NOT IN (SELECT id FROM atoms)
                `).run();

                const delTarget = db.prepare(`
                    DELETE FROM atom_relations 
                    WHERE target_id NOT IN (SELECT id FROM atoms)
                `).run();

                logger.info(`✅ Purged ${delSource.changes + delTarget.changes} orphaned relations.`);
            })();
        }

        // 3. Audit orphaned issues
        const orphanedIssues = db.prepare(`
            SELECT COUNT(*) as count FROM semantic_issues
            WHERE file_path != 'project-wide' AND file_path NOT IN (SELECT path FROM files)
        `).get();

        logger.info(`🔍 Found ${orphanedIssues.count} orphaned issues.`);

        if (orphanedIssues.count > 0) {
            const result = db.prepare(`
                DELETE FROM semantic_issues
                WHERE file_path != 'project-wide' AND file_path NOT IN (SELECT path FROM files)
            `).run();
            logger.info(`✅ Purged ${result.changes} orphaned issues.`);
        }


        // 4. Vacuum to optimize after large deletion
        logger.info('⚙️  Vacuuming database...');
        db.exec('VACUUM');

        logger.info('✨ Remediation Complete.');

    } catch (error) {
        logger.error(`❌ Remediation failed: ${error.message}`);
        process.exit(1);
    } finally {
        db.close();
    }
}

startupJanitor();
