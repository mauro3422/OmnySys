#!/usr/bin/env node
/**
 * MCP Shell Helper - Interactive CLI for OmnySys MCP Server
 *
 * Usage:
 *   node mcp-shell-helper.js [tool] [args...]
 *   node mcp-shell-helper.js list
 *   node mcp-shell-helper.js status
 *   node mcp-shell-helper.js query_graph instances atomic_edit
 *   node mcp-shell-helper.js schema atoms
 *
 * Timeout: Default 5 minutes, can be overridden with --timeout option
 */

import { readFileSync } from 'fs';
import http from 'http';

const MCP_URL = 'http://localhost:9999/mcp';
let sessionId = null;

const DEFAULT_TIMEOUT = 300000; // 5 minutes

const TOOL_SHORTCUTS = {
    list: { tool: 'mcp_omnysystem_list_tools', args: { includeSchemas: false } },
    status: { tool: 'mcp_omnysystem_get_server_status', args: {} },
    health: { tool: 'mcp_omnysystem_get_health_panel', args: {} },
    inventory: { tool: 'mcp_omnysystem_get_system_inventory_report', args: {} },
    schema: { tool: 'mcp_omnysystem_get_schema', args: {} },
    modules: { tool: 'mcp_omnysystem_aggregate_metrics', args: { aggregationType: 'modules' } },
    atoms: { tool: 'mcp_omnysystem_get_schema', args: { type: 'atoms' } },
    debt: { tool: 'mcp_omnysystem_get_technical_debt_report', args: {} },
    reindex: { tool: 'mcp_omnysystem_restart_server', args: { reindexOnly: true } },
};

const MCP_RESTART_URL = 'http://localhost:9999/restart';

async function initialize(timeout = DEFAULT_TIMEOUT) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            jsonrpc: "2.0",
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "shell-helper", version: "1.0.0" }
            },
            id: 1
        });

        const req = http.request(`${MCP_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            },
            timeout: timeout
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                sessionId = res.headers['mcp-session-id'];
                resolve(sessionId);
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            reject(new Error(`Initialization timeout after ${timeout}ms`));
            req.destroy();
        });
        req.write(data);
        req.end();
    });
}

async function httpRestart(options = {}) {
    const timeout = options.timeout || 180000;
    const data = JSON.stringify(options.args || {});

    return new Promise((resolve, reject) => {
        const req = http.request(MCP_RESTART_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            },
            timeout: timeout
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json.error) {
                        reject(new Error(json.error));
                    }
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            reject(new Error(`Restart timeout after ${timeout}ms`));
            req.destroy();
        });
        req.write(data);
        req.end();
    });
}

async function waitForMCPReady(maxWaitMs = 120000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
        try {
            const toolsResult = await callTool('mcp_omnysystem_list_tools', { includeSchemas: false }, 10000);
            const tools = JSON.parse(toolsResult);
            if (tools.success !== false) {
                return tools;
            }
            await new Promise(r => setTimeout(r, 2000));
        } catch {
            await new Promise(r => setTimeout(r, 3000));
        }
    }
    throw new Error('MCP did not become ready in time');
}

async function callTool(toolName, args = {}, timeout = DEFAULT_TIMEOUT) {
    if (!sessionId) await initialize(timeout);

    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: toolName,
                arguments: args
            },
            id: Date.now()
        });

        const req = http.request(`${MCP_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'mcp-session-id': sessionId
            },
            timeout: timeout
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json.error) {
                        console.error('Error:', json.error.message);
                        process.exit(1);
                    }
                    resolve(json.result.content[0].text);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            reject(new Error(`Tool call timeout after ${timeout}ms`));
            req.destroy();
        });
        req.write(data);
        req.end();
    });
}

function parseArgs(args) {
    let timeout = DEFAULT_TIMEOUT;
    let waitForReady = false;
    const result = {};

    function parseValue(value) {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (typeof value === 'string' && value.startsWith('{')) {
            return JSON.parse(value);
        }
        return value;
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (key === 'timeout') {
                timeout = parseInt(next) || DEFAULT_TIMEOUT;
                i++;
            } else if (key === 'wait') {
                waitForReady = true;
            } else if (next && !next.startsWith('--')) {
                result[key] = parseValue(next);
                i++;
            } else {
                result[key] = true;
            }
        } else if (arg.startsWith('{')) {
            return { args: JSON.parse(arg), timeout, waitForReady };
        } else if (!isNaN(arg)) {
            return { args: arg, timeout, waitForReady };
        }
    }
    return { args: Object.keys(result).length ? result : null, timeout, waitForReady };
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
MCP Shell Helper - Interactive CLI for OmnySys

Usage:
  node mcp-shell-helper.js <command> [args...]

Shortcuts:
  list                           List all 47 MCP tools
  status                         Server status
  health                         Health panel
  modules                        Module inventory
  atoms                          Atom schema stats
  debt                           Technical debt report

Options:
  --timeout <ms>                Timeout in milliseconds (default: 300000)
  --wait                         Wait for MCP to be ready (phase1/restart)

Examples:
  node mcp-shell-helper.js list
  node mcp-shell-helper.js status
  node mcp-shell-helper.js reindex         Restart with reindex (in-process)
  node mcp-shell-helper.js reindex --processRestart Full restart via proxy (preserves DB)
  node mcp-shell-helper.js query_graph instances atomic_edit
  node mcp-shell-helper.js schema atoms
  node mcp-shell-helper.js status --wait
`);
        process.exit(1);
    }

    const cmd = args[0];
    const { args: parsedArgs, timeout, waitForReady } = parseArgs(args.slice(1));

    // Helper to wait for MCP to be ready
    async function waitForMCP(maxWaitMs = 120000) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            try {
                const toolsResult = await callTool('mcp_omnysystem_list_tools', { includeSchemas: false }, 10000);
                const tools = JSON.parse(toolsResult);

                if (tools.success !== false) {
                    return tools;
                }

                console.log('⏳ MCP not ready... waiting');
                await new Promise(r => setTimeout(r, 2000));
            } catch {
                console.log('⏳ MCP not responding... waiting');
                await new Promise(r => setTimeout(r, 3000));
            }
        }
        throw new Error('MCP did not become ready in time');
    }

    // Check if we need to wait for MCP
    if (waitForReady) {
        console.log('🔄 Waiting for MCP to be ready...');
        await waitForMCP();
        console.log('✅ MCP is ready!');
    }

    // Handle restart/reindex specially via HTTP endpoint
    if (cmd === 'reindex') {
        console.log('🔄 Initiating restart/reindex...');

        const restartArgs = { reindexOnly: true };
        if (parsedArgs?.processRestart) {
            restartArgs.processRestart = true;
            restartArgs.reindexOnly = false;
        } else if (parsedArgs?.reanalyze) {
            restartArgs.reanalyze = true;
        }

        try {
            const result = await httpRestart({ args: restartArgs, timeout: timeout });
            console.log('Restart result:', JSON.stringify(result, null, 2));

            if (result.success && result.restarting) {
                console.log('⏳ Waiting for server to become ready...');
                await waitForMCPReady(120000);
                console.log('✅ Server is ready!');
            }
        } catch (e) {
            console.error('Restart failed:', e.message);
        }
        return;
    }

    // Check shortcuts
    if (TOOL_SHORTCUTS[cmd]) {
        const { tool, args: defaultArgs } = TOOL_SHORTCUTS[cmd];
        const finalArgs = { ...defaultArgs, ...(parsedArgs || {}) };
        await initialize(timeout);
        const result = await callTool(tool, finalArgs, timeout);
        console.log(result);
        return;
    }

    // Map command to tool name
    let toolName = cmd.startsWith('mcp_') ? cmd : `mcp_omnysystem_${cmd}`;

    try {
        await initialize(timeout);
        const result = await callTool(toolName, parsedArgs || {}, timeout);
        console.log(result);
    } catch (e) {
        console.error('Failed:', e.message);
        process.exit(1);
    }
}

main();
