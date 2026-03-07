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
                    logger.info('📊 Generating Technical Debt Report...');
                    const { getRepository: getRepo } = await import('#layer-c/storage/repository/index.js');
                    const debtRepo = getRepo(this.projectPath);
                    if (debtRepo?.db) {
                        const { queryDuplicates, queryIsomorphicDuplicates } = await import('#layer-c/mcp/tools/semantic/semantic-queries.js');
                        const { buildDuplicateRemediationPlan } = await import('#shared/compiler/index.js');

                        // Structural duplicates
                        const { rows: dupRows, stats: dupStats } = queryDuplicates(debtRepo.db, { limit: 50 });
                        const structuralDuplicates = new (await import('#layer-c/mcp/tools/semantic/handlers/duplicate-handler.js')).DuplicateHandler(debtRepo.db).handle(dupRows);
                        const structuralRemediation = buildDuplicateRemediationPlan(structuralDuplicates);

                        // Conceptual duplicates
                        const conceptualGroups = debtRepo.findConceptualDuplicates ? debtRepo.findConceptualDuplicates({ limit: 50 }) : [];

                        // Pipeline orphans
                        const { getPipelineOrphanSummary } = await import('#shared/compiler/index.js');
                        const orphanSummary = getPipelineOrphanSummary(debtRepo.db);

                        // Log consolidated report
                        logger.info(`✅ Technical Debt Report Generated:`);
                        logger.info(`   - Structural Duplicates: ${structuralDuplicates.length} groups (${dupStats.total_instances} instances)`);
                        logger.info(`   - Conceptual Duplicates: ${conceptualGroups.length} groups`);
                        logger.info(`   - Pipeline Orphans: ${orphanSummary?.total || 0} atoms`);
                        logger.info(`   - Top Priority: ${structuralRemediation?.items?.[0]?.canonical?.name || 'None'}`);

                        // Store in semantic_issues for MCP tools to read
                        const { persistWatcherIssue, clearWatcherIssue } = await import('#core/file-watcher/watcher-issue-persistence.js');
                        const { createIssueType, createStandardContext } = await import('#core/file-watcher/guards/guard-standards.js');

                        await clearWatcherIssue(this.projectPath, 'project-wide', 'technical_debt_report');

                        const totalDebtItems = (structuralRemediation?.totalGroups || 0) + (conceptualGroups?.length || 0) + (orphanSummary?.total || 0);
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
                                        groups: conceptualGroups.length,
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
                            logger.info('   - Report persisted in semantic_issues for MCP tools');
                        }
                    }

                    // NEW: Run Pipeline Integrity Check post-Phase 2
                    logger.info('🔍 Running Pipeline Integrity Check...');
                    const { PipelineIntegrityDetector } = await import('#core/meta-detector/pipeline-integrity-detector.js');
                    const { IntegrityDashboard } = await import('#core/meta-detector/integrity-dashboard.js');
                    
                    const detector = new PipelineIntegrityDetector(this.projectPath);
                    const integrityResults = await detector.verify();
                    
                    if (integrityResults.length > 0) {
                        const dashboard = new IntegrityDashboard();
                        const integrityReport = await dashboard.generateReport(integrityResults);
                        
                        logger.info(`✅ Pipeline Integrity Check Complete:`);
                        logger.info(`   - Overall Health: ${integrityReport.overallHealth}/100 (Grade: ${integrityReport.grade})`);
                        logger.info(`   - Passed Checks: ${integrityReport.summary.passedChecks}/${integrityReport.summary.totalChecks}`);
                        logger.info(`   - Critical Issues: ${integrityReport.summary.criticalIssues}`);
                        logger.info(`   - Warnings: ${integrityReport.summary.warnings}`);
                        
                        if (integrityReport.recommendations.length > 0) {
                            logger.info(`   - Top Recommendation: ${integrityReport.recommendations[0].action}`);
                        }
                        
                        // Store in semantic_issues if there are critical issues
                        if (integrityReport.summary.criticalIssues > 0) {
                            const { persistWatcherIssue } = await import('#core/file-watcher/watcher-issue-persistence.js');
                            const { createIssueType } = await import('#core/file-watcher/guards/guard-standards.js');
                            
                            await persistWatcherIssue(
                                this.projectPath,
                                'project-wide',
                                createIssueType('arch', 'pipeline_integrity', 'high'),
                                'high',
                                `Pipeline integrity check failed: ${integrityReport.overallHealth}/100 (Grade: ${integrityReport.grade})`,
                                {
                                    source: 'phase2_post_completion',
                                    timestamp: new Date().toISOString(),
                                    overallHealth: integrityReport.overallHealth,
                                    grade: integrityReport.grade,
                                    criticalIssues: integrityReport.criticalIssues,
                                    recommendations: integrityReport.recommendations.slice(0, 5)
                                }
                            );
                            logger.info('   - Critical issues persisted in semantic_issues');
                        }
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
