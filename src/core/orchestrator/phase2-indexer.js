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
        this.startedAt = null;
    }

    async _ensureGlobalTimer(totalItems) {
        if (this.globalTimer || totalItems <= 0) return;

        const { BatchTimer } = await import('#utils/performance-tracker.js');
        this.globalTimer = new BatchTimer('Phase 2 Deep Scan', totalItems, true);
    }

    _syncPhase2Totals(pendingFiles, processedGroup = 0) {
        const processedCount = this.processedPaths.size;
        const inferredTotal = pendingFiles + processedCount;
        const currentTotal = this.orchestrator.totalPhase2Files || 0;
        const nextTotal = Math.max(currentTotal, inferredTotal, pendingFiles + processedGroup);

        this.orchestrator.totalPhase2Files = nextTotal;
        return nextTotal;
    }

    async start() {
        if (this.interval) return;

        logger.debug('Starting Background Phase 2 Indexer (Deep Metadata)...');
        this.startedAt = Date.now();

        try {
            const { getRepository } = await import('#layer-c/storage/repository/index.js');
            const repo = getRepository(this.projectPath);
            if (repo && repo.db) {
                const countResult = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as count FROM atoms WHERE is_phase2_complete = 0').get();
                const initialPending = countResult?.count || 0;
                this.orchestrator.totalPhase2Files = initialPending;
                this._updateStatus(initialPending);

                if (initialPending > 0) {
                    logger.debug(`Phase 2: Pending analysis for ${this.orchestrator.totalPhase2Files} files`);
                    await this._ensureGlobalTimer(initialPending);
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
                    const persistMissingFiles = hrMissing.db.transaction((paths) => {
                        const stmt = repo.db.prepare(`UPDATE atoms SET is_removed = 1, is_phase2_complete = 1, purpose_type = 'DEAD_CODE' WHERE file_path = ?`);
                        for (const p of paths) stmt.run(p);
                    });
                    persistMissingFiles(missingFiles);
                }

                if (filesToProcess.length > 0) {
                    const hr = new BaseSqlRepository(repo.db, 'Indexer:Batch');
                    const clearPendingAtoms = hr.db.transaction((paths) => {
                        for (const p of paths) hr.delete('atoms', 'file_path', p);
                    });
                    clearPendingAtoms(filesToProcess);

                    const absoluteFiles = filesToProcess.map(f => path.join(this.projectPath, f));
                    await analyzeProjectFilesUnified(absoluteFiles, this.projectPath, false, 'deep');

                    for (const relPath of filesToProcess) {
                        const absPath = path.join(this.projectPath, relPath);
                        this.orchestrator.indexedFiles.add(absPath);
                        this.orchestrator.processedFiles.add(absPath);
                    }
                }

                if (this.globalTimer) {
                    this.globalTimer.onItemProcessed(countProcessedGroup);
                }

                const remainingQuery = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as count FROM atoms WHERE is_phase2_complete = 0').get();
                const remainingCount = remainingQuery?.count || 0;
                const nextTotal = this._syncPhase2Totals(remainingCount, countProcessedGroup);
                await this._ensureGlobalTimer(nextTotal);

                if (this.globalTimer) {
                    this.globalTimer.totalItems = nextTotal;
                }

                this._updateStatus(remainingCount);

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
        this._updateStatus(0, complete);

        if (complete) {
            (async () => {
                try {
                    const { persistGraphMetrics } = await import('#layer-c/storage/enrichment/index.js');
                    await persistGraphMetrics(this.projectPath);
                    logger.debug('Phase 2 complete - final graph metrics persisted');

                    // NEW: Build Shared State relations across entire project now that deep scan is fully complete
                    const { getRepository } = await import('#layer-c/storage/repository/index.js');
                    const repo = getRepository(this.projectPath);
                    const allAtoms = repo.getAll({ limit: 0 });
                    if (allAtoms && allAtoms.length > 0) {
                        const { saveSharedStateRelations } = await import('#layer-a/pipeline/link.js');
                        await saveSharedStateRelations(allAtoms, this.projectPath, true);
                    }

                    // NEW: Generate Technical Debt Report post-Phase 2
                    // NEW: Generate Technical Debt Report post-Phase 2
                    const { getRepository: getRepo } = await import('#layer-c/storage/repository/index.js');
                    const debtRepo = getRepo(this.projectPath);
                    if (debtRepo?.db) {
                        const { queryDuplicates } = await import('#layer-c/mcp/tools/semantic/semantic-queries.js');
                        const { buildDuplicateRemediationPlan, getPipelineOrphanSummary } = await import('#shared/compiler/index.js');

                        // Structural duplicates
                        const { rows: dupRows, stats: dupStats } = queryDuplicates(debtRepo.db, { limit: 50 });
                        const structuralDuplicates = new (await import('#layer-c/mcp/tools/semantic/handlers/duplicate-handler.js')).DuplicateHandler(debtRepo.db).handle(dupRows);
                        const structuralRemediation = buildDuplicateRemediationPlan(structuralDuplicates);

                        // Conceptual duplicates
                        const conceptualGroups = debtRepo.findConceptualDuplicates ? debtRepo.findConceptualDuplicates({ limit: 50 }) : [];
                        const conceptualSummary = conceptualGroups?.summary || null;

                        // Pipeline orphans
                        const orphanSummary = getPipelineOrphanSummary(debtRepo.db);

                        // Store in semantic_issues for MCP tools to read
                        const { persistWatcherIssue, clearWatcherIssue } = await import('#core/file-watcher/watcher-issue-persistence.js');
                        const { createIssueType } = await import('#core/file-watcher/guards/guard-standards.js');

                        await clearWatcherIssue(this.projectPath, 'project-wide', 'technical_debt_report');

                        const totalDebtItems =
                            (structuralRemediation?.totalGroups || 0) +
                            (conceptualSummary?.actionable?.groupCount || conceptualGroups?.length || 0) +
                            (orphanSummary?.total || 0);
                        if (totalDebtItems > 0) {
                            await persistWatcherIssue(
                                this.projectPath,
                                'project-wide',
                                createIssueType('arch', 'technical_debt', totalDebtItems > 10 ? 'high' : totalDebtItems > 5 ? 'medium' : 'low'),
                                totalDebtItems > 10 ? 'high' : totalDebtItems > 5 ? 'medium' : 'low',
                                `${totalDebtItems} technical debt items detected post-Phase 2`,
                                {
                                    source: 'phase2_post_completion',
                                    timestamp: new Date().toISOString(),
                                    structural: {
                                        groups: structuralDuplicates.length,
                                        instances: dupStats.total_instances,
                                        topIssues: structuralRemediation?.items?.slice(0, 5) || []
                                    },
                                    conceptual: {
                                        groups: conceptualSummary?.actionable?.groupCount || conceptualGroups.length,
                                        rawGroups: conceptualSummary?.raw?.groupCount || conceptualGroups.length,
                                        noiseByClass: conceptualSummary?.noiseByClass || {},
                                        topIssues: conceptualGroups.slice(0, 5).map(g => ({
                                            fingerprint: g.semanticFingerprint,
                                            implementationCount: g.implementationCount
                                        }))
                                    },
                                    pipelineOrphans: {
                                        total: orphanSummary?.total || 0,
                                        items: orphanSummary?.items?.slice(0, 5) || []
                                    },
                                    remediation: {
                                        nextAction: structuralRemediation?.recommendation || orphanSummary?.recommendation || 'No immediate action required'
                                    }
                                }
                            );
                        }
                    }

                    // 📊 Print Consolidated Diagnostics Dashboard (FINAL)
                    try {
                        const { printDiagnosticsDashboard } = await import('#layer-c/mcp/core/initialization/dashboard-reporter.js');
                        await printDiagnosticsDashboard(this.projectPath, { isFinal: true });
                    } catch (err) {
                        logger.debug('Failed to display final Diagnostics Dashboard:', err.message);
                    }
                } catch (e) {
                    logger.debug('  ⚠️  Post-Phase2 completion tasks failed:', e.message);
                }
            })();
        }
    }

    _updateStatus(pendingFiles = 0, completed = false) {
        const totalFiles = this.orchestrator.totalPhase2Files || pendingFiles || 0;
        const processedFiles = Math.max(0, totalFiles - pendingFiles);
        const elapsedMs = this.startedAt ? Date.now() - this.startedAt : 0;
        const rate = elapsedMs > 0 ? processedFiles / (elapsedMs / 1000) : 0;
        const percent = totalFiles > 0 ? Number(((processedFiles / totalFiles) * 100).toFixed(1)) : 100;
        const etaMs = (!completed && rate > 0) ? Math.round((pendingFiles / rate) * 1000) : 0;

        this.orchestrator.phase2Status = {
            inProgress: !completed && pendingFiles > 0,
            completed,
            totalFiles,
            processedFiles,
            pendingFiles,
            completedFiles: processedFiles,
            percentComplete: percent,
            rateItemsPerSecond: Number(rate.toFixed(1)),
            etaMs,
            startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
            lastUpdatedAt: new Date().toISOString()
        };
    }
}
