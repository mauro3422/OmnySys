import { createLogger } from '../../utils/logger.js';
import { processPhase2Batch } from './phase2-indexer/batch-processing.js';
import { runPhase2CompletionTasks } from './phase2-indexer/completion-tasks.js';
import { initializePhase2Start } from './phase2-indexer/startup.js';
import { buildPhase2Status } from './phase2-indexer/status.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { evaluatePipelineTimingTelemetry, persistPipelineTimingTelemetry } from '#shared/compiler/index.js';

const logger = createLogger('OmnySys:Phase2Indexer');

export class Phase2Indexer {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.projectPath = orchestrator.projectPath;
        this.interval = null;
        this.isBursting = false;
        this.processedPaths = new Set();
        this.startedAt = null;
        this.globalTimer = null;
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
        await initializePhase2Start(this, logger);

        this.interval = setInterval(() => this._processBatch(), 1000);
    }

    async _processBatch() {
        if (this.orchestrator.queue.size() > 20 || !this.orchestrator.isRunning || this.isBursting) return;

        this.isBursting = true;
        try {
            await processPhase2Batch({
                indexer: this,
                orchestrator: this.orchestrator,
                projectPath: this.projectPath,
                logger,
                onUpdateStatus: (remainingCount) => this._updateStatus(remainingCount)
            });
        } catch (error) {
            if (!error.message.includes('not initialized')) {
                logger.warn(`Background Phase 2 indexer error: ${error.message}`);
            }
        } finally {
            this.isBursting = false;
        }
    }

    stop(complete = false) {
        let phase2Timing = null;
        if (this.globalTimer) {
            const timing = this.globalTimer.end(complete);
            phase2Timing = timing?.elapsed > 0
              ? {
                  projectPath: this.projectPath,
                  runKind: 'phase2_deep_scan',
                  captureSource: 'phase2.indexer.complete',
                  startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
                  endedAt: new Date().toISOString(),
                  success: complete === true,
                  phaseTimings: [{
                    name: 'Phase 2 Deep Scan',
                    elapsedMs: timing.elapsed,
                    memoryDeltaMb: 0
                  }]
                }
              : null;
            this.globalTimer = null;
        }

        clearInterval(this.interval);
        this.interval = null;
        this._updateStatus(0, complete);

        if (complete) {
            if (phase2Timing) {
                try {
                    const repo = getRepository(this.projectPath);
                    if (repo?.db) {
                        const telemetry = evaluatePipelineTimingTelemetry(phase2Timing);
                        persistPipelineTimingTelemetry(repo.db, telemetry);
                    }
                } catch {
                    // Advisory telemetry only.
                }
            }
            void runPhase2CompletionTasks(this.projectPath, logger);
        }
    }

    _updateStatus(pendingFiles = 0, completed = false) {
        const totalFiles = this.orchestrator.totalPhase2Files || pendingFiles || 0;
        this.orchestrator.phase2Status = buildPhase2Status({
            totalFiles,
            pendingFiles,
            completed,
            startedAt: this.startedAt
        });
    }
}
