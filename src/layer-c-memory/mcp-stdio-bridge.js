#!/usr/bin/env node
/**
 * OmnySys MCP Stdio Bridge
 *
 * Bridges stdio transport (IDE side) ↔ Streamable HTTP (OmnySys daemon).
 *   IDE ←── stdio ──→ [mcp-stdio-bridge] ──► HTTP ──► [mcp-http-server :9999]
 *
 * No worker, no DB, no analysis — pure transport proxy.
 * Path-agnostic: works from any install location.
 *
 * Env vars (optional):
 *   OMNYSYS_DAEMON_URL   — MCP endpoint  (default: http://127.0.0.1:9999/mcp)
 *   OMNYSYS_HEALTH_URL   — Health check  (default: http://127.0.0.1:9998/health)
 *
 * Usage (auto-written by npm run setup / node install.js):
 *   mcp_config.json → { "command": "node", "args": ["/path/to/mcp-stdio-bridge.js"] }
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const DAEMON_URL = new URL(process.env.OMNYSYS_DAEMON_URL || 'http://127.0.0.1:9999/mcp');
const DAEMON_HEALTH = process.env.OMNYSYS_HEALTH_URL || 'http://127.0.0.1:9998/health';

function log(msg) {
    process.stderr.write(`[mcp-stdio-bridge] ${new Date().toISOString().slice(11, 23)} ${msg}\n`);
}

async function checkDaemon() {
    const { default: http } = await import('http');
    return new Promise((resolve) => {
        const req = http.get(DAEMON_HEALTH, { timeout: 3000 }, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                try { resolve(JSON.parse(data).service === 'omnysys-mcp'); }
                catch { resolve(false); }
            });
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

async function main() {
    log('Starting — checking daemon...');

    // Wait for daemon (max 15s)
    let ready = false;
    for (let i = 0; i < 15; i++) {
        ready = await checkDaemon();
        if (ready) break;
        log(`Daemon not ready (${i + 1}/15), retrying in 1s...`);
        await new Promise((r) => setTimeout(r, 1000));
    }

    if (!ready) {
        log('ERROR: Daemon not reachable at http://127.0.0.1:9998/health');
        log('Start the daemon: node src/layer-c-memory/mcp-http-server.js');
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
