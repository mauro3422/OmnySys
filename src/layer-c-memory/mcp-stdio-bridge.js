#!/usr/bin/env node
/**
 * OmnySys MCP Stdio Bridge
 *
 * Bridges stdio transport (IDE side) ↔ Streamable HTTP (OmnySys daemon).
 *   IDE ←── stdio ──→ [mcp-stdio-bridge] ──► HTTP ──► [mcp-http-server :9999]
 *
 * AUTO-START CAPABLE: If daemon is not running, this bridge will start it.
 *
 * No worker, no DB, no analysis — pure transport proxy.
 * Path-agnostic: works from any install location.
 *
 * Env vars (optional):
 *   OMNYSYS_DAEMON_URL   — MCP endpoint  (default: http://127.0.0.1:9999/mcp)
 *   OMNYSYS_HEALTH_URL   — Health check  (default: http://127.0.0.1:9999/health)
 *   OMNYSYS_AUTO_START   — Auto-start daemon if not running (default: 1)
 *
 * Usage (auto-written by npm run setup / node install.js):
 *   mcp_config.json → { "command": "node", "args": ["/path/to/mcp-stdio-bridge.js"] }
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const DAEMON_URL = new URL(process.env.OMNYSYS_DAEMON_URL || 'http://127.0.0.1:9999/mcp');
const DAEMON_HEALTH = process.env.OMNYSYS_HEALTH_URL || 'http://127.0.0.1:9999/health';
const AUTO_START = process.env.OMNYSYS_AUTO_START !== '0'; // Default: auto-start enabled

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function log(msg) {
    process.stderr.write(`[mcp-stdio-bridge] ${new Date().toISOString().slice(11, 23)} ${msg}\n`);
}

async function checkDaemon() {
    const { default: http } = await import('http');
    return new Promise((resolve) => {
        const req = http.get(DAEMON_HEALTH, { timeout: 2000 }, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.service === 'omnysys-mcp' || json.service === 'omnysys-mcp-http' || json.status !== undefined);
                }
                catch { resolve(false); }
            });
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

async function startDaemon() {
    log('Daemon not running, attempting auto-start...');

    // Try to find the daemon script
    const possiblePaths = [
        path.join(__dirname, 'mcp-http-server.js'),
        path.join(__dirname, '..', '..', 'mcp-http-server.js'),
        path.join(__dirname, 'layer-c-memory', 'mcp-http-server.js'),
        'C:\\Dev\\OmnySystem\\src\\layer-c-memory\\mcp-http-server.js',
        'C:\\Dev\\OmnySystem\\mcp-http-server.js'
    ];

    let daemonPath = null;
    for (const p of possiblePaths) {
        try {
            const { default: fs } = await import('fs/promises');
            await fs.access(p);
            daemonPath = p;
            break;
        } catch {
            continue;
        }
    }

    if (!daemonPath) {
        log('ERROR: Cannot find mcp-http-server.js');
        return false;
    }

    log(`Starting daemon: ${daemonPath}`);

    // Start daemon in background (detached)
    const daemonProcess = spawn('node', [daemonPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });

    daemonProcess.unref();

    // Wait for daemon to start (max 10s)
    for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const ready = await checkDaemon();
        if (ready) {
            log('Daemon started successfully');
            return true;
        }
    }

    log('ERROR: Daemon failed to start within 10 seconds');
    return false;
}

async function main() {
    log('Starting — checking daemon...');

    // Check if daemon is running
    let ready = await checkDaemon();

    // Auto-start daemon if not running and auto-start is enabled
    if (!ready && AUTO_START) {
        ready = await startDaemon();
    }

    // If still not ready, wait a bit more (daemon might be starting)
    if (!ready) {
        log('Waiting for daemon to initialize...');
        for (let i = 0; i < 10; i++) {
            ready = await checkDaemon();
            if (ready) break;
            log(`Waiting (${i + 1}/10)...`);
            await new Promise((r) => setTimeout(r, 1000));
        }
    }

    if (!ready) {
        log('ERROR: Daemon not reachable');
        log(`Health URL: ${DAEMON_HEALTH}`);
        log('Manual start: node src/layer-c-memory/mcp-http-server.js');
        process.exit(1);
    }

    log(`Daemon ready. Bridging stdio ↔ ${DAEMON_URL}`);

    // Transport facing the IDE (Antigravity) — reads stdin, writes stdout
    const stdioTransport = new StdioServerTransport();

    let httpTransport;
    let isReconnecting = false;

    async function connectToDaemon() {
        httpTransport = new StreamableHTTPClientTransport(DAEMON_URL);

        // Wire messages: daemon → IDE
        httpTransport.onmessage = async (message) => {
            try {
                await stdioTransport.send(message);
            } catch (err) {
                log(`Error forwarding daemon→IDE: ${err.message}`);
            }
        };

        httpTransport.onerror = (err) => log(`http error: ${err.message}`);

        httpTransport.onclose = async () => {
            log('Daemon disconnected.');
            if (isReconnecting) return;
            isReconnecting = true;

            log('Daemon disconnected — attempting recovery for 15 seconds...');

            let recovered = false;
            for (let i = 0; i < 15; i++) {
                recovered = await checkDaemon();
                if (recovered) break;
                log(`Waiting for daemon to restart (${i + 1}/15)...`);
                await new Promise((r) => setTimeout(r, 1000));
            }

            if (!recovered) {
                log('Daemon recovery failed. Shutting down bridge.');
                stdioTransport.close().catch(() => { });
                process.exit(1);
            }

            log('Daemon recovered. Reconnecting HTTP transport...');
            try {
                await connectToDaemon();
                log('Bridge reconnected successfully.');
            } catch (e) {
                log(`Reconnection failed: ${e.message}`);
                process.exit(1);
            }
            isReconnecting = false;
        };

        await httpTransport.start();
    }

    // Inicializar conexión HTTPS
    await connectToDaemon();

    // Wire messages: IDE → daemon
    stdioTransport.onmessage = async (message) => {
        if (isReconnecting) {
            log('IDE requested operation while daemon is restarting. Dropping message.');
            return;
        }
        try {
            await httpTransport.send(message);
        } catch (err) {
            log(`Error forwarding IDE→daemon: ${err.message}`);
        }
    };

    stdioTransport.onerror = (err) => log(`stdio error: ${err.message}`);

    // Close handlers
    stdioTransport.onclose = () => {
        log('IDE disconnected — shutting down bridge.');
        if (httpTransport && !isReconnecting) {
            httpTransport.close().catch(() => { });
        }
        process.exit(0);
    };

    await stdioTransport.start();

    log('Bridge active.');
}

main().catch((err) => {
    process.stderr.write(`[mcp-stdio-bridge] FATAL: ${err.message}\n`);
    process.exit(1);
});
