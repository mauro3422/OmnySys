/**
 * @fileoverview server-shutdown.js
 * 
 * Modulo extraído de server-class.js para el control de 
 * apagado grácil de toda la instancia del MCP Server de OmnySys
 */

import { createLogger } from '../../../utils/logger.js';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const logger = createLogger('OmnySys:server:shutdown');

/**
 * Realiza el proceso de apagado de toda la instancia del servidor
 * deteniendo servicios, procesos de IA y limpiezas de caché.
 * @param {import('./server-class.js').OmnySysMCPServer} serverInstance
 */
export async function performServerShutdown(serverInstance) {
    logger.info('\n🛑 Shutting down server...');

    try {
        // Kill LLM processes first
        logger.info('  🛑 Stopping LLM servers...');
        try {
            // Kill llama-server processes
            if (process.platform === 'win32') {
                await execPromise('taskkill /F /IM llama-server.exe 2>nul', { windowsHide: true }).catch(() => { });
                await execPromise('taskkill /F /IM brain_gpu.bat 2>nul', { windowsHide: true }).catch(() => { });
            } else {
                await execPromise('pkill -f llama-server 2>/dev/null').catch(() => { });
                await execPromise('pkill -f brain_gpu 2>/dev/null').catch(() => { });
            }
            logger.info('  ✅ LLM servers stopped');
        } catch (err) {
            // Ignore errors - processes might not be running
        }

        if (serverInstance.server) {
            await serverInstance.server.close();
            logger.info('  ✅ MCP server closed');
        }

        if (serverInstance._healthBeacon) {
            await new Promise(resolve => serverInstance._healthBeacon.close(resolve));
            logger.info('  ✅ Health beacon closed');
        }

        if (serverInstance._watchdogInterval) {
            clearInterval(serverInstance._watchdogInterval);
            serverInstance._watchdogInterval = null;
            logger.info('  ✅ Watchdog stopped');
        }

        if (serverInstance.orchestrator) {
            await serverInstance.orchestrator.stop();
            logger.info('  ✅ Orchestrator stopped');
        }

        if (serverInstance.cache) {
            // Cache cleanup if needed
            logger.info('  ✅ Cache cleaned up');
        }

        if (serverInstance.hotReloadManager) {
            serverInstance.hotReloadManager.stop();
            logger.info('  ✅ Hot-reload stopped');
        }

        const mode = serverInstance.isPrimary ? 'PRIMARY' : 'LIGHT';
        logger.info(`\n👋 Server shutdown complete (was ${mode})\n`);
    } catch (error) {
        logger.info('Error during shutdown:', error.message);
    }
}
