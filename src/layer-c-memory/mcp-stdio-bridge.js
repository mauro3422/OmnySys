#!/usr/bin/env node
/**
 * OmnySys MCP Stdio Bridge
 *
 * Bridges stdio transport (IDE side) <-> Streamable HTTP (OmnySys daemon).
 * It can also auto-start the daemon when the HTTP endpoint is not available.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const DAEMON_URL = new URL(process.env.OMNYSYS_DAEMON_URL || 'http://127.0.0.1:9999/mcp');
const DAEMON_HEALTH = process.env.OMNYSYS_HEALTH_URL || 'http://127.0.0.1:9999/health';
const AUTO_START = process.env.OMNYSYS_AUTO_START !== '0';
const PROJECT_PATH = path.resolve(process.env.OMNYSYS_PROJECT_PATH || process.cwd());
const DAEMON_PORT = String(DAEMON_URL.port || '9999');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function log(message) {
    process.stderr.write(`[mcp-stdio-bridge] ${new Date().toISOString().slice(11, 23)} ${message}\n`);
}

async function checkDaemon() {
    const { default: http } = await import('http');
    return new Promise((resolve) => {
        const req = http.get(DAEMON_HEALTH, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(
                        json.service === 'omnysys-mcp' ||
                        json.service === 'omnysys-mcp-http' ||
                        typeof json.status !== 'undefined'
                    );
                } catch {
                    resolve(false);
                }
            });
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function resolveDaemonEntry() {
    const candidates = [
        path.join(PROJECT_PATH, 'src', 'layer-c-memory', 'mcp-http-proxy.js'),
        path.join(PROJECT_PATH, 'mcp-http-proxy.js'),
        path.join(__dirname, 'mcp-http-proxy.js'),
        path.join(__dirname, '..', '..', 'mcp-http-server.js'),
        path.join(__dirname, 'mcp-http-server.js'),
        path.join(PROJECT_PATH, 'mcp-http-server.js'),
        path.join(PROJECT_PATH, 'src', 'layer-c-memory', 'mcp-http-server.js')
    ];

    const { default: fs } = await import('fs/promises');
    for (const candidate of candidates) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            // try next candidate
        }
    }

    return null;
}

async function startDaemon() {
    log(`Daemon not running, attempting auto-start for ${PROJECT_PATH}...`);

    const daemonEntry = await resolveDaemonEntry();
    if (!daemonEntry) {
        log('ERROR: Cannot find mcp-http-server.js');
        return false;
    }

    log(`Starting daemon entry: ${daemonEntry}`);

    const daemonProcess = spawn(process.execPath, [
        '--max-old-space-size=8192',
        daemonEntry,
        PROJECT_PATH,
        DAEMON_PORT
    ], {
        cwd: PROJECT_PATH,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: {
            ...process.env,
            OMNYSYS_MCP_PORT: DAEMON_PORT
        }
    });

    daemonProcess.unref();

    for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
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
    log(`Starting bridge for ${PROJECT_PATH} - checking daemon...`);

    let ready = await checkDaemon();
    if (!ready && AUTO_START) {
        ready = await startDaemon();
    }

    if (!ready) {
        log('Waiting for daemon to initialize...');
        for (let i = 0; i < 10; i++) {
            ready = await checkDaemon();
            if (ready) break;
            log(`Waiting (${i + 1}/10)...`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    if (!ready) {
        log('ERROR: Daemon not reachable');
        log(`Health URL: ${DAEMON_HEALTH}`);
        log(`Manual start: node src/layer-c-memory/mcp-http-proxy.js ${PROJECT_PATH} ${DAEMON_PORT}`);
        process.exit(1);
    }

    log(`Daemon ready. Bridging stdio <-> ${DAEMON_URL}`);

    const stdioTransport = new StdioServerTransport();
    let httpTransport;
    let isReconnecting = false;
    let reconnectPromise = null;
    let lastSessionId = null;

    async function connectToDaemon() {
        httpTransport = new StreamableHTTPClientTransport(DAEMON_URL, lastSessionId ? { sessionId: lastSessionId } : undefined);

        httpTransport.onmessage = async (message) => {
            try {
                await stdioTransport.send(message);
            } catch (err) {
                log(`Error forwarding daemon->IDE: ${err.message}`);
            }
        };

        httpTransport.onerror = (err) => log(`http error: ${err.message}`);

        httpTransport.onclose = async () => {
            log('Daemon disconnected.');
            if (isReconnecting) return;
            isReconnecting = true;
            reconnectPromise = (async () => {
                log('Daemon disconnected - attempting recovery for 15 seconds...');

                let recovered = false;
                for (let i = 0; i < 15; i++) {
                    recovered = await checkDaemon();
                    if (recovered) break;
                    log(`Waiting for daemon to restart (${i + 1}/15)...`);
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                if (!recovered) {
                    log('Daemon recovery failed. Shutting down bridge.');
                    stdioTransport.close().catch(() => {});
                    process.exit(1);
                }

                log('Daemon recovered. Reconnecting HTTP transport...');
                try {
                    await connectToDaemon();
                    log(`Bridge reconnected successfully${lastSessionId ? ` (session ${lastSessionId})` : ''}.`);
                } catch (error) {
                    log(`Reconnection failed: ${error.message}`);
                    process.exit(1);
                }
            })();

            try {
                await reconnectPromise;
            } finally {
                isReconnecting = false;
                reconnectPromise = null;
            }
        };

        await httpTransport.start();
    }

    await connectToDaemon();

    stdioTransport.onmessage = async (message) => {
        if (isReconnecting) {
            log('IDE requested an operation while daemon is restarting. Waiting for bridge recovery...');
            await reconnectPromise;
        }
        try {
            await httpTransport.send(message);
            if (httpTransport?._sessionId) {
                lastSessionId = httpTransport._sessionId;
            }
        } catch (err) {
            log(`Error forwarding IDE->daemon: ${err.message}`);
        }
    };

    stdioTransport.onerror = (err) => log(`stdio error: ${err.message}`);
    stdioTransport.onclose = () => {
        log('IDE disconnected - shutting down bridge.');
        if (httpTransport && !isReconnecting) {
            httpTransport.close().catch(() => {});
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


