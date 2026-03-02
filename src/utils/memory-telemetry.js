/**
 * @fileoverview memory-telemetry.js
 * 
 * Utility for monitoring process memory usage during heavy indexing tasks.
 */

import { createLogger } from './logger.js';

const logger = createLogger('OmnySys:Telemetry:Memory');

/**
 * Formats bytes into a human-readable string.
 * @param {number} bytes 
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Logs the current process memory usage.
 * @param {string} label - Context label for the log
 */
export function logMemoryUsage(label = '') {
    const memory = process.memoryUsage();

    const rss = formatBytes(memory.rss);
    const heapTotal = formatBytes(memory.heapTotal);
    const heapUsed = formatBytes(memory.heapUsed);
    const external = formatBytes(memory.external);
    const arrayBuffers = formatBytes(memory.arrayBuffers || 0);

    const prefix = label ? `[${label}] ` : '';

    logger.info(`${prefix}Memory Telemetry:`);
    logger.info(`  - RSS: ${rss} (Total process memory)`);
    logger.info(`  - Heap Used: ${heapUsed} / ${heapTotal}`);
    logger.info(`  - External (Native): ${external}`);
    logger.info(`  - ArrayBuffers: ${arrayBuffers}`);

    // Warning if RAM is high (near 4GB limit for Node default sometimes)
    if (memory.rss > 3.5 * 1024 * 1024 * 1024) {
        logger.warn('  ⚠️  CRITICAL: RAM usage is extremely high (> 3.5GB)');
    }
}

export default { logMemoryUsage };
