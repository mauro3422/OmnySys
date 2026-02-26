import { createLogger } from '#utils/logger.js';
import { getWriteQueue } from './write-queue.js';
import { writeJSON } from './graceful-write.js';

const logger = createLogger('OmnySys:batch-writer');

export class BatchWriterFlusher {
    #queue;
    #debounceMs;
    #batchSize;
    #flushInterval;
    #flushTimer = null;
    #writeQueue;
    #isFlushing = false;
    #stats = {
        batches: 0,
        bytesWritten: 0,
        avgBatchSize: 0
    };
    #batchSizeSum = 0;

    constructor(queue, options = {}) {
        this.#queue = queue;
        this.#debounceMs = options.debounceMs || 100;
        this.#batchSize = options.batchSize || 50;
        this.#flushInterval = options.flushInterval || 1000;
        this.#writeQueue = options.writeQueue || getWriteQueue();
    }

    get batchSize() {
        return this.#batchSize;
    }

    startTimer() {
        this.#flushTimer = setInterval(() => {
            if (this.#queue.size > 0) {
                this.flush().catch(err => {
                    logger.error('Auto-flush error:', err);
                });
            }
        }, this.#flushInterval);

        this.#flushTimer.unref?.();
    }

    stopTimer() {
        if (this.#flushTimer) {
            clearInterval(this.#flushTimer);
            this.#flushTimer = null;
        }
    }

    async flush() {
        if (this.#isFlushing || this.#queue.size === 0) {
            return { flushed: 0 };
        }

        this.#isFlushing = true;
        const batch = this.#queue.takeBatch(this.#batchSize);

        if (batch.length === 0) {
            this.#isFlushing = false;
            return { flushed: 0 };
        }

        this.#stats.batches++;
        this.#batchSizeSum += batch.length;
        this.#stats.avgBatchSize = this.#batchSizeSum / this.#stats.batches;

        logger.debug(`Flushing batch of ${batch.length} writes (${this.#queue.size} remaining)`);

        try {
            const results = await this.#writeQueue.addAll(
                batch.map(item => async () => {
                    try {
                        await writeJSON(item.path, item.data);
                        const bytes = JSON.stringify(item.data).length;
                        this.#stats.bytesWritten += bytes;
                        item.resolve();
                        return { success: true, path: item.path };
                    } catch (error) {
                        item.reject(error);
                        logger.error(`Failed to write ${item.path}:`, error.message);
                        return { success: false, path: item.path, error: error.message };
                    }
                }),
                { id: `batch-${Date.now()}` }
            );

            return {
                flushed: batch.length,
                success: results.filter(r => r?.success).length,
                failed: results.filter(r => !r?.success).length
            };
        } finally {
            this.#isFlushing = false;

            if (this.#queue.size > 0) {
                process.nextTick(() => this.flush());
            }
        }
    }

    async drain() {
        while (this.#queue.size > 0 || this.#isFlushing) {
            await this.flush();
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await this.#writeQueue.onIdle();
    }

    get stats() {
        return { ...this.#stats };
    }

    get isFlushing() {
        return this.#isFlushing;
    }

    get queueStatus() {
        return this.#writeQueue.status;
    }
}
