/**
 * @fileoverview Shared Worker Process Manager
 *
 * Common child_process spawning logic for both HTTP proxy (mcp-http-proxy.js)
 * and stdio proxy (mcp-server.js). Eliminates conceptual duplication across
 * proxy implementations.
 *
 * @module layer-c-memory/worker-spawner
 */

import { spawn } from 'child_process';

/**
 * Build Node.js execution arguments: memory limits, GC exposure, debug flags.
 */
export function buildExecArgv() {
    const execArgv = process.execArgv.filter(a =>
        a.startsWith('--max-old-space-size') || a.startsWith('--inspect') || a === '--expose-gc'
    );
    if (!execArgv.some(a => a.startsWith('--max-old-space-size'))) {
        execArgv.push('--max-old-space-size=8192');
    }
    if (!execArgv.includes('--expose-gc')) {
        execArgv.push('--expose-gc');
    }
    return execArgv;
}

/**
 * Spawn a worker child process with IPC channel, proper stdio routing,
 * and proxy environment flags.
 *
 * @param {string} workerPath - Absolute path to the worker script
 * @param {string[]} workerArgs - Arguments to pass to the worker
 * @param {Object} options - Additional spawn options
 * @param {string} [options.proxyModeEnv] - Value for OMNYSYS_PROXY_MODE
 * @param {string[]} [options.extraEnv] - Additional environment variable pairs ["KEY=VALUE"]
 * @param {string} [options.stdioConfig] - stdio config, default: ['ignore', 'inherit', 'inherit', 'ipc']
 * @returns {import('child_process').ChildProcess}
 */
export function spawnWorkerProcess(workerPath, workerArgs = [], options = {}) {
    const {
        proxyModeEnv = null,
        extraEnv = [],
        stdioConfig = ['ignore', 'inherit', 'inherit', 'ipc']
    } = options;

    const execArgv = buildExecArgv();
    const env = { ...process.env };

    if (proxyModeEnv) {
        env.OMNYSYS_PROXY_MODE = proxyModeEnv;
    }
    for (const pair of extraEnv) {
        const [key, value] = pair.split('=');
        env[key] = value;
    }

    return spawn(process.execPath, [...execArgv, workerPath, ...workerArgs], {
        stdio: stdioConfig,
        windowsHide: true,
        env
    });
}

/**
 * Graceful shutdown handler: kill child, exit parent.
 *
 * @param {import('child_process').ChildProcess|null} child - Worker process
 * @param {string} label - Label for logging
 * @param {Function} logFn - Logging function
 * @param {Function} [onShutdown] - Optional cleanup callback before exit
 */
export function createShutdownHandler(child, label, logFn, onShutdown) {
    let inProgress = false;

    return function shutdown() {
        if (inProgress) return;
        inProgress = true;
        logFn(`${label} SIGINT/SIGTERM — shutting down worker...`);
        if (child) child.kill('SIGTERM');
        if (onShutdown) onShutdown();
        setTimeout(() => process.exit(0), 2000);
    };
}
