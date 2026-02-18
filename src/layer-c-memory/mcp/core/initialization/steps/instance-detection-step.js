/**
 * @fileoverview instance-detection-step.js
 *
 * Step 0: Multi-Client Instance Detection
 *
 * Detects if another OmnySys MCP server is already running.
 * If yes, sets server to LIGHT mode (read-only from .omnysysdata/).
 * If no, sets server to PRIMARY mode and starts a health beacon
 * so future instances can detect us.
 *
 * Auto-promotes LIGHT -> PRIMARY if the original PRIMARY dies.
 *
 * @module mcp/core/initialization/steps/instance-detection-step
 */

import { InitializationStep } from './base-step.js';
import http from 'http';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:instance:detection');

const HEALTH_PORT = 9998;
const WATCHDOG_INTERVAL_MS = 30000; // Check every 30s

/**
 * Step 0: Instance Detection
 * Must run BEFORE all other steps
 */
export class InstanceDetectionStep extends InitializationStep {
    constructor() {
        super('instance-detection');
    }

    async execute(server) {
        logger.info('Checking for existing OmnySys instances...');

        const existingPrimary = await this._detectExistingInstance();

        if (existingPrimary) {
            // LIGHT MODE
            server.isPrimary = false;
            server.healthPort = null;
            logger.info('Existing PRIMARY instance found on port ' + HEALTH_PORT);
            logger.info('This instance will run in LIGHT mode (read-only from .omnysysdata/)');
            logger.info('Heavy steps (LLM, Orchestrator) will be skipped');
            logger.info('Watchdog active: will auto-promote if PRIMARY dies');

            // Start watchdog to monitor PRIMARY health
            this._startWatchdog(server);
        } else {
            // PRIMARY MODE - Start health beacon
            const beaconStarted = await this._startHealthBeacon(server);

            if (beaconStarted) {
                server.isPrimary = true;
                server.healthPort = HEALTH_PORT;
                logger.info('This instance is the PRIMARY (health beacon on port ' + HEALTH_PORT + ')');
                logger.info('Other IDEs will auto-detect and connect in LIGHT mode');
            } else {
                // Race condition: someone grabbed the port between check and bind
                server.isPrimary = false;
                server.healthPort = null;
                logger.info('Port race detected, switching to LIGHT mode');
                this._startWatchdog(server);
            }
        }

        return true; // Always continue pipeline
    }

    /**
     * Detect if another primary instance is already running
     * @returns {Promise<boolean>}
     */
    async _detectExistingInstance() {
        return new Promise((resolve) => {
            const req = http.get(
                `http://localhost:${HEALTH_PORT}/health`,
                { timeout: 2000 },
                (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const json = JSON.parse(data);
                            resolve(json.service === 'omnysys-mcp');
                        } catch {
                            resolve(false);
                        }
                    });
                }
            );
            req.on('error', () => resolve(false));
            req.on('timeout', () => { req.destroy(); resolve(false); });
        });
    }

    /**
     * Start the health beacon HTTP server
     * @param {Object} server - OmnySysMCPServer instance
     * @returns {Promise<boolean>}
     */
    async _startHealthBeacon(server) {
        return new Promise((resolve) => {
            server._healthBeacon = http.createServer((req, res) => {
                if (req.url === '/health' && req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        service: 'omnysys-mcp',
                        mode: 'primary',
                        project: server.projectPath,
                        initialized: server.initialized,
                        uptime: process.uptime()
                    }));
                } else {
                    res.writeHead(404).end();
                }
            });

            server._healthBeacon.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    logger.warn(`Port ${HEALTH_PORT} already in use`);
                    resolve(false);
                } else {
                    logger.error('Health beacon error:', err.message);
                    resolve(false);
                }
            });

            server._healthBeacon.listen(HEALTH_PORT, () => {
                logger.info(`  Health beacon listening on http://localhost:${HEALTH_PORT}/health`);
                resolve(true);
            });
        });
    }

    /**
     * Watchdog: periodically checks if PRIMARY is still alive.
     * If PRIMARY dies, auto-promotes this instance to PRIMARY.
     * @param {Object} server - OmnySysMCPServer instance
     */
    _startWatchdog(server) {
        server._watchdogInterval = setInterval(async () => {
            const primaryAlive = await this._detectExistingInstance();

            if (!primaryAlive && !server.isPrimary) {
                logger.info('PRIMARY instance no longer responding!');
                logger.info('Auto-promoting LIGHT -> PRIMARY...');

                clearInterval(server._watchdogInterval);
                server._watchdogInterval = null;

                await this._promoteToPrimary(server);
            }
        }, WATCHDOG_INTERVAL_MS);

        // Don't prevent process exit
        if (server._watchdogInterval.unref) {
            server._watchdogInterval.unref();
        }
    }

    /**
     * Promotes this instance from LIGHT to PRIMARY
     * Starts health beacon and runs the heavy init steps
     * @param {Object} server - OmnySysMCPServer instance
     */
    async _promoteToPrimary(server) {
        try {
            // 1. Claim the health beacon port
            const beaconStarted = await this._startHealthBeacon(server);

            if (!beaconStarted) {
                logger.warn('Another instance claimed PRIMARY first, staying LIGHT');
                this._startWatchdog(server); // Restart watchdog
                return;
            }

            server.isPrimary = true;
            server.healthPort = HEALTH_PORT;

            // 2. Run heavy initialization steps
            logger.info('Running heavy initialization steps...');

            try {
                const { startLLM } = await import('../../llm-starter.js');
                await startLLM(server.OmnySysRoot);
                logger.info('  LLM server started');
            } catch (error) {
                logger.info(`  LLM not available: ${error.message}`);
            }

            try {
                const { checkAndRunAnalysis } = await import('../../analysis-checker.js');
                await checkAndRunAnalysis(server.projectPath);
                logger.info('  Layer A analysis complete');
            } catch (error) {
                logger.info(`  Layer A analysis skipped: ${error.message}`);
            }

            try {
                const { Orchestrator } = await import('#core/orchestrator/index.js');
                server.orchestrator = new Orchestrator(server.projectPath, {
                    enableFileWatcher: true,
                    enableWebSocket: false,
                    autoStartLLM: false
                });
                await server.orchestrator.initialize();
                logger.info('  Orchestrator initialized');
            } catch (error) {
                logger.info(`  Orchestrator failed: ${error.message}`);
            }

            logger.info('AUTO-PROMOTION COMPLETE: This instance is now PRIMARY');
            logger.info(`Health beacon on port ${HEALTH_PORT}`);

        } catch (error) {
            logger.error('Auto-promotion failed:', error.message);
            server.isPrimary = false;
            // Restart watchdog to try again later
            this._startWatchdog(server);
        }
    }

    async rollback(server, error) {
        // Clean up health beacon if we started one
        if (server._healthBeacon) {
            await new Promise(resolve => server._healthBeacon.close(resolve));
            logger.info('  Health beacon closed (rollback)');
        }
        if (server._watchdogInterval) {
            clearInterval(server._watchdogInterval);
            server._watchdogInterval = null;
        }
    }
}

export default InstanceDetectionStep;
