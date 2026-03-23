/**
 * @fileoverview Base CLI Orchestrator
 *
 * Provides a standardized abstraction for OmnySys CLI entry points and worker processes.
 * Encapsulates common boilerplate such as resolving the project path, global error handling,
 * logging configuration, and process graceful shutdown.
 *
 * @module shared/cli/base-orchestrator
 */

import path from 'path';

/**
 * Creates a standardized CLI orchestrator.
 * 
 * @param {Object} options Configuration for the orchestrator
 * @param {string} options.name Name of the CLI process (used for logging)
 * @param {Function} options.logger Factory or instance of logger
 * @param {Function} options.run The main business logic to execute. Receives (projectPath, absolutePath, logger)
 * @param {Function} [options.onInterrupt] Optional handler for SIGINT/SIGTERM
 * @param {boolean} [options.keepAlive=false] If true, does not automatically exit the process when `run` resolves
 * @returns {Function} A main() function ready to be executed
 */
export function createCliOrchestrator({
    name,
    logger: loggerInstanceOrFactory,
    run,
    onInterrupt,
    keepAlive = false
}) {
    return async function main(overrideArgs = null) {
        // Resolve logger
        const logger = typeof loggerInstanceOrFactory === 'function' && !loggerInstanceOrFactory.info
            ? loggerInstanceOrFactory(`OmnySys:${name}`)
            : loggerInstanceOrFactory;

        // Resolve Project Path
        const args = overrideArgs || process.argv.slice(2);
        const projectPath = args[0] || process.cwd();
        const absolutePath = path.isAbsolute(projectPath)
            ? path.normalize(projectPath)
            : path.resolve(projectPath);

        // Setup Graceful Shutdown
        const handleShutdown = async (signal) => {
            logger.info(`\n👋 [${name}] Received ${signal}, shutting down...`);
            if (onInterrupt) {
                try {
                    await onInterrupt();
                } catch (err) {
                    logger.error(`Error during graceful shutdown: ${err.message}`);
                }
            }
            process.exit(0);
        };

        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));

        process.on('uncaughtException', async (error) => {
            // EPIPE is often expected when IPC/MCP pipes close
            const isEpipe = error.code === 'EPIPE' ||
                (error.message && error.message.includes('EPIPE')) ||
                (error.message && error.message.includes('broken pipe'));

            if (isEpipe) {
                if (logger.debug) {
                    logger.debug('⚠️  EPIPE ignored (client disconnected/pipe broken)');
                }
                return;
            }

            logger.error(`\n❌ [${name}] Uncaught exception:`, error);
            if (onInterrupt) {
                try {
                    await onInterrupt();
                } catch (err) {
                    // Ignore shutdown errors to ensure we exit
                }
            }
            process.exit(1);
        });

        // Execute core logic
        try {
            await run({
                projectPath,
                absolutePath,
                args,
                logger
            });

            if (!keepAlive) {
                process.exit(0);
            }
        } catch (error) {
            logger.error(`\n❌ [${name}] Fatal error:`, error);
            process.exit(1);
        }
    };
}
