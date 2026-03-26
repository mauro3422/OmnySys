/**
 * @fileoverview server-shutdown.js
 *
 * Module extracted from server-class.js for graceful shutdown of the
 * OmnySys MCP server instance.
 */

import { createLogger } from '../../../utils/logger.js';
import { exec } from 'child_process';
import util from 'util';
import { closeIfPresent, stopIfPresent } from '../../../shared/lifecycle/shutdown-helpers.js';

const execPromise = util.promisify(exec);
const logger = createLogger('OmnySys:server:shutdown');

/**
 * Performs the shutdown of the full server instance.
 * @param {import('./server-class.js').OmnySysMCPServer} serverInstance
 */
export async function performServerShutdown(serverInstance) {
    logger.info('\nStopping server...');

    try {
        logger.info('  Stopping LLM servers...');
        try {
            if (process.platform === 'win32') {
                await execPromise('taskkill /F /IM llama-server.exe 2>nul', { windowsHide: true }).catch(() => {});
                await execPromise('taskkill /F /IM brain_gpu.bat 2>nul', { windowsHide: true }).catch(() => {});
            } else {
                await execPromise('pkill -f llama-server 2>/dev/null').catch(() => {});
                await execPromise('pkill -f brain_gpu 2>/dev/null').catch(() => {});
            }
            logger.info('  LLM servers stopped');
        } catch (err) {
            // Ignore errors - processes might not be running.
        }

        if (await closeIfPresent(serverInstance.server)) {
            logger.info('  MCP server closed');
        }

        if (await closeIfPresent(serverInstance._healthBeacon)) {
            logger.info('  Health beacon closed');
        }

        if (serverInstance._watchdogInterval) {
            clearInterval(serverInstance._watchdogInterval);
            serverInstance._watchdogInterval = null;
            logger.info('  Watchdog stopped');
        }

        if (await stopIfPresent(serverInstance.orchestrator)) {
            logger.info('  Orchestrator stopped');
        }

        if (serverInstance.cache) {
            logger.info('  Cache cleaned up');
        }

        if (await stopIfPresent(serverInstance.hotReloadManager)) {
            logger.info('  Hot-reload stopped');
        }

        const mode = serverInstance.isPrimary ? 'PRIMARY' : 'LIGHT';
        logger.info(`\nServer shutdown complete (was ${mode})\n`);
    } catch (error) {
        logger.info('Error during shutdown:', error.message);
    }
}
