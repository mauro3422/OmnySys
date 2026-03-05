import path from 'path';
import { createLogger } from '../../utils/logger.js';
import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';

const logger = createLogger('OmnySys:Phase2Indexer');

export class Phase2Indexer {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.projectPath = orchestrator.projectPath;
        this.interval = null;
        this.isBursting = false;
        this.processedPaths = new Set();
    }

    async start() {
        if (this.interval) return;

        logger.info('🔄 Starting Background Phase 2 Indexer (Deep Metadata)...');

        try {
            const { getRepository } = await import('#layer-c/storage/repository/index.js');
            const repo = getRepository(this.projectPath);
            if (repo && repo.db) {
                const countResult = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as count FROM atoms WHERE is_phase2_complete = 0').get();
                this.orchestrator.totalPhase2Files = countResult?.count || 0;

                if (this.orchestrator.totalPhase2Files > 0) {
                    logger.info(`📊 Phase 2: Pending analysis for ${this.orchestrator.totalPhase2Files} files`);
                    const { BatchTimer } = await import('#utils/performance-tracker.js');
                    this.globalTimer = new BatchTimer('Phase 2 Deep Scan', this.orchestrator.totalPhase2Files, true);
                }
            }
        } catch (e) {
            logger.debug('Could not initialize Phase 2 total count yet');
        }

        this.interval = setInterval(() => this._processBatch(), 1000);
    }

    async _processBatch() {
        if (this.orchestrator.queue.size() > 20 || !this.orchestrator.isRunning || this.isBursting) return;

        this.isBursting = true;
        try {
            const { getRepository } = await import('#layer-c/storage/repository/index.js');
            const repo = getRepository(this.projectPath);
            if (!repo || !repo.db) return;

            const rows = repo.db.prepare(`
                SELECT DISTINCT file_path 
                FROM atoms 
                WHERE is_phase2_complete = 0 
                LIMIT 200
            `).all();

            if (rows.length === 0) {
                this.stop(true);
                return;
            }

            const filesToProcess = [];
            const missingFiles = [];
            const fs = await import('fs');

            let countProcessedGroup = 0;

            for (const row of rows) {
                const relPath = row.file_path;
                if (this.processedPaths.has(relPath)) continue;

                this.processedPaths.add(relPath);
                countProcessedGroup++;

                const absPath = path.join(this.projectPath, relPath);
                if (fs.existsSync(absPath)) {
                    filesToProcess.push(relPath);
                } else {
                    missingFiles.push(relPath);
                }
            }

            if (countProcessedGroup > 0) {
                const { analyzeProjectFilesUnified } = await import('#layer-a/pipeline/unified-analysis.js');

                if (missingFiles.length > 0) {
                    const hrMissing = new BaseSqlRepository(repo.db, 'Indexer:Missing');
                    hrMissing.transaction((paths) => {
                        const stmt = repo.db.prepare(`UPDATE atoms SET is_removed = 1, is_phase2_complete = 1, purpose_type = 'DEAD_CODE' WHERE file_path = ?`);
                        for (const p of paths) stmt.run(p);
                    })(missingFiles);
                }

                if (filesToProcess.length > 0) {
                    const hr = new BaseSqlRepository(repo.db, 'Indexer:Batch');
                    hr.transaction((paths) => {
                        for (const p of paths) hr.delete('atoms', 'file_path', p);
                    })(filesToProcess);

                    const absoluteFiles = filesToProcess.map(f => path.join(this.projectPath, f));
                    await analyzeProjectFilesUnified(absoluteFiles, this.projectPath, false, 'deep');

                    for (const relPath of filesToProcess) {
                        const absPath = path.join(this.projectPath, relPath);
                        this.orchestrator.indexedFiles.add(absPath);
                        this.orchestrator.processedFiles.add(absPath);
                    }
                }

                if (this.globalTimer) {
                    const remainingQuery = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as count FROM atoms WHERE is_phase2_complete = 0').get();
                    if (remainingQuery) {
                        // Sumamos los itemsProcessed previos + el grupo actual procesado + los que faltan = total real actualizado
                        this.globalTimer.totalItems = this.globalTimer.itemsProcessed + countProcessedGroup + remainingQuery.count;
                    }
                    this.globalTimer.onItemProcessed(countProcessedGroup);
                }

                this.orchestrator.emit('job:complete', { filePath: filesToProcess[0] }, {});
            } else if (rows.length > 0) {
                // DEADLOCK DETECTED: the query returned files, but ALL of them are already in processedPaths.
                // This means these specific files failed completely in a previous batch and never
                // got marked as is_phase2_complete = 1. If we don't stop, this will loop infinitely.
                logger.warn(`⚠️ Phase 2 Indexer Deadlock Detected: ${rows.length} files constantly failing analysis. Bypassing them and ending phase 2.`);
                this.stop(true);
                return;
            }
        } catch (e) {
            if (!e.message.includes('not initialized')) {
                logger.warn(`⚠️ Background Phase 2 indexer error: ${e.message}`);
            }
        } finally {
            this.isBursting = false;
        }
    }

    stop(complete = false) {
        if (this.globalTimer) {
            this.globalTimer.end(complete);
            this.globalTimer = null;
        }
        clearInterval(this.interval);
        this.interval = null;

        if (complete) {
            (async () => {
                try {
                    const { persistGraphMetrics } = await import('#layer-c/storage/enrichment/index.js');
                    await persistGraphMetrics(this.projectPath);
                    logger.info('  📊 Phase 2 complete — final graph metrics persisted');

                    // NEW: Build Shared State relations across entire project now that deep scan is fully complete
                    const { getRepository } = await import('#layer-c/storage/repository/index.js');
                    const repo = getRepository(this.projectPath);
                    const allAtoms = repo.getAll({ limit: 0 });
                    if (allAtoms && allAtoms.length > 0) {
                        const { saveSharedStateRelations } = await import('#layer-a/pipeline/link.js');
                        await saveSharedStateRelations(allAtoms, this.projectPath, true);
                    }
                } catch (e) {
                    logger.debug('  ⚠️  Post-Phase2 completion tasks failed:', e.message);
                }
            })();
        }
    }
}
