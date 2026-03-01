#!/usr/bin/env node

/**
 * MCP Auto-Start Script
 * 
 * This script is designed to be sourced or called when opening a terminal.
 * It checks if the OmnySys MCP daemon is running, and starts it if not.
 * 
 * Usage:
 *   - Direct: node scripts/mcp-autostart.js
 *   - From shell profile: Add to .bashrc, .zshrc, or profile.ps1
 * 
 * This ensures MCP is available for Qwen CLI, Claude CLI, Gemini CLI, etc.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const DAEMON_SCRIPT = path.join(repoRoot, 'src', 'layer-c-memory', 'mcp-http-server.js');
const PORT = 9999;
const HOST = '127.0.0.1';

function log(message, type = 'info') {
    const prefix = {
        info: 'ℹ️',
        success: '✅',
        warn: '⚠️',
        error: '❌'
    }[type] || '•';
    console.log(`${prefix} ${message}`);
}

/**
 * Check if MCP daemon is running by probing the health endpoint
 */
async function checkDaemon() {
    return new Promise((resolve) => {
        const req = http.get(`http://${HOST}:${PORT}/health`, { timeout: 2000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.status !== undefined);
                } catch {
                    resolve(false);
                }
            });
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

/**
 * Start the MCP daemon in background
 */
function startDaemon() {
    return new Promise((resolve, reject) => {
        log('Starting OmnySys MCP daemon...', 'info');
        
        const daemonProcess = spawn('node', [DAEMON_SCRIPT], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
            env: { ...process.env, OMNYSYS_MCP_PORT: PORT.toString() }
        });

        daemonProcess.unref();

        // Wait for daemon to be ready (max 15s)
        let attempts = 0;
        const maxAttempts = 30; // 15 seconds

        const checkInterval = setInterval(async () => {
            attempts++;
            const ready = await checkDaemon();
            
            if (ready) {
                clearInterval(checkInterval);
                log('MCP daemon started successfully', 'success');
                resolve(true);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                log('MCP daemon failed to start within 15 seconds', 'error');
                reject(new Error('Daemon startup timeout'));
            }
        }, 500);
    });
}

/**
 * Main auto-start logic
 */
async function main() {
    try {
        const isRunning = await checkDaemon();
        
        if (isRunning) {
            log('MCP daemon is already running', 'success');
            return { started: false, alreadyRunning: true };
        }

        await startDaemon();
        return { started: true, alreadyRunning: false };
    } catch (error) {
        log(`Auto-start failed: ${error.message}`, 'error');
        return { started: false, error: error.message };
    }
}

// Run if called directly
if (process.argv[1] && process.argv[1].includes('mcp-autostart')) {
    main()
        .then(result => {
            if (result.started || result.alreadyRunning) {
                process.exit(0);
            } else {
                process.exit(1);
            }
        })
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

export { main, checkDaemon, startDaemon };
