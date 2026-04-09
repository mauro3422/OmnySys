import fs from 'fs/promises';
import path from 'path';

import { stripBom, upsertTomlTable } from './utils.js';

const OMNYSYSTEM_TABLE = 'mcp_servers.omnysystem';

function isWslEnvironment() {
    return process.platform === 'linux' && Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);
}

function getWindowsCodexConfigPath() {
    const userProfile = String(process.env.USERPROFILE || '').trim();
    if (userProfile) {
        return path.join(userProfile, '.codex', 'config.toml');
    }

    const username = String(process.env.USERNAME || '').trim();
    if (username) {
        return path.join('/mnt/c/Users', username, '.codex', 'config.toml');
    }

    return '';
}

function getWslCodexConfigPath() {
    return path.join(process.env.HOME || '', '.codex', 'config.toml');
}

function getTableHeaders(content = '') {
    return String(content)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith('[') && line.endsWith(']'))
        .map((line) => line.slice(1, -1));
}

function extractTomlTable(content, tableName) {
    const lines = String(content || '').split(/\r?\n/);
    const header = `[${tableName}]`;
    const start = lines.findIndex((line) => line.trim() === header);

    if (start === -1) {
        return null;
    }

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            end = i;
            break;
        }
    }

    return lines.slice(start + 1, end);
}

function isMcpTable(tableName = '') {
    return tableName.startsWith('mcp_servers.');
}

function windowsPathToWsl(filePath = '') {
    const normalized = String(filePath || '').trim().replace(/\\/g, '/');
    const driveMatch = normalized.match(/^([A-Za-z]):\/(.*)$/);
    if (!driveMatch) {
        return normalized;
    }

    const [, drive, rest] = driveMatch;
    return `/mnt/${drive.toLowerCase()}/${rest}`;
}

function getTomlStringValue(lines = [], key = '') {
    const matcher = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*"([^"]*)"\\s*$`);
    for (const line of lines) {
        const match = String(line).match(matcher);
        if (match) {
            return match[1];
        }
    }
    return '';
}

function getTomlNumberValue(lines = [], key = '') {
    const matcher = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(\\d+)\\s*$`);
    for (const line of lines) {
        const match = String(line).match(matcher);
        if (match) {
            return Number(match[1]);
        }
    }
    return null;
}

function getTomlBooleanValue(lines = [], key = '') {
    const matcher = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(true|false)\\s*$`);
    for (const line of lines) {
        const match = String(line).match(matcher);
        if (match) {
            return match[1] === 'true';
        }
    }
    return null;
}

function getTomlArrayValues(lines = [], key = '') {
    const matcher = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*\\[(.*)\\]\\s*$`);
    for (const line of lines) {
        const match = String(line).match(matcher);
        if (match) {
            return Array.from(match[1].matchAll(/"([^"]*)"/g), (entry) => entry[1]);
        }
    }
    return [];
}

function getTomlInlineTableMap(lines = [], key = '') {
    const matcher = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*\\{(.*)\\}\\s*$`);
    for (const line of lines) {
        const match = String(line).match(matcher);
        if (!match) {
            continue;
        }

        const entries = {};
        for (const pair of match[1].matchAll(/([A-Za-z0-9_]+)\s*=\s*"([^"]*)"/g)) {
            entries[pair[1]] = pair[2];
        }
        return entries;
    }
    return {};
}

function stringifyInlineTable(map = {}) {
    const entries = Object.entries(map)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key} = "${String(value).replace(/"/g, '\\"')}"`);
    return `{ ${entries.join(', ')} }`;
}

function resolveOmnysystemProjectPath(tableBody = []) {
    const env = getTomlInlineTableMap(tableBody, 'env');
    const envProjectPath = windowsPathToWsl(env.OMNYSYS_PROJECT_PATH || '');
    if (envProjectPath) {
        return envProjectPath;
    }

    const cwd = windowsPathToWsl(getTomlStringValue(tableBody, 'cwd'));
    if (cwd) {
        return cwd;
    }

    const [bridgePath] = getTomlArrayValues(tableBody, 'args');
    if (bridgePath) {
        const normalizedBridgePath = windowsPathToWsl(bridgePath);
        return path.dirname(path.dirname(path.dirname(normalizedBridgePath)));
    }

    return windowsPathToWsl(process.cwd());
}

function buildWslOmnysystemTableBody(tableBody = []) {
    const env = getTomlInlineTableMap(tableBody, 'env');
    const projectPath = resolveOmnysystemProjectPath(tableBody);
    const launcherPath = path.posix.join(projectPath, 'scripts', 'mcp', 'omnysystem-wsl-bridge.sh');
    const startupTimeout = getTomlNumberValue(tableBody, 'startup_timeout_sec') || 120;
    const enabled = getTomlBooleanValue(tableBody, 'enabled');

    const nextEnv = {
        ...env,
        OMNYSYS_DAEMON_URL: env.OMNYSYS_DAEMON_URL || 'http://127.0.0.1:9999/mcp',
        OMNYSYS_HEALTH_URL: env.OMNYSYS_HEALTH_URL || 'http://127.0.0.1:9999/health',
        OMNYSYS_AUTO_START: '0',
        OMNYSYS_PROJECT_PATH: projectPath,
        OMNYSYS_CLIENT_ID: env.OMNYSYS_CLIENT_ID || 'codex',
        OMNYSYS_CLIENT_NAME: env.OMNYSYS_CLIENT_NAME || 'codex'
    };

    const lines = [
        'type = "stdio"',
        'command = "bash"',
        `args = ["${launcherPath}"]`,
        `cwd = "${projectPath}"`,
        `startup_timeout_sec = ${startupTimeout}`,
        `env = ${stringifyInlineTable(nextEnv)}`
    ];

    if (enabled !== null) {
        lines.push(`enabled = ${enabled ? 'true' : 'false'}`);
    }

    return lines;
}

function isWindowsOnlyOmnysystemTable(tableBody = []) {
    const command = getTomlStringValue(tableBody, 'command');
    const cwd = getTomlStringValue(tableBody, 'cwd');
    const [bridgePath] = getTomlArrayValues(tableBody, 'args');
    const env = getTomlInlineTableMap(tableBody, 'env');

    return /[A-Za-z]:\//.test(command)
        || /\.exe$/i.test(command)
        || /[A-Za-z]:\//.test(cwd)
        || /[A-Za-z]:\//.test(bridgePath || '')
        || /[A-Za-z]:\//.test(env.OMNYSYS_PROJECT_PATH || '');
}

function isWrapperBackedWslOmnysystemTable(tableBody = []) {
    const command = getTomlStringValue(tableBody, 'command');
    const args = getTomlArrayValues(tableBody, 'args');
    return command === 'bash' && args[0]?.endsWith('/scripts/mcp/omnysystem-wsl-bridge.sh');
}

function isLegacyWslNodeBridgeTable(tableBody = []) {
    const command = getTomlStringValue(tableBody, 'command');
    const args = getTomlArrayValues(tableBody, 'args');
    const env = getTomlInlineTableMap(tableBody, 'env');

    return command === 'node'
        && args[0]?.endsWith('/src/layer-c-memory/mcp-stdio-bridge.js')
        && (env.OMNYSYS_PROJECT_PATH || '').startsWith('/mnt/');
}

export async function syncWindowsCodexMcpToWsl() {
    if (!isWslEnvironment()) {
        return {
            applied: false,
            reason: 'not_wsl'
        };
    }

    const windowsConfigPath = getWindowsCodexConfigPath();
    const wslConfigPath = getWslCodexConfigPath();

    if (!windowsConfigPath || !wslConfigPath) {
        return {
            applied: false,
            reason: 'missing_paths'
        };
    }

    let windowsContent = '';
    try {
        windowsContent = stripBom(await fs.readFile(windowsConfigPath, 'utf8'));
    } catch {
        return {
            applied: false,
            reason: 'windows_config_missing',
            windowsConfigPath,
            wslConfigPath
        };
    }

    const mcpTables = getTableHeaders(windowsContent).filter(isMcpTable);
    if (mcpTables.length === 0) {
        return {
            applied: false,
            reason: 'no_windows_mcp_tables',
            windowsConfigPath,
            wslConfigPath
        };
    }

    let wslContent = '';
    try {
        wslContent = stripBom(await fs.readFile(wslConfigPath, 'utf8'));
    } catch {
        wslContent = '';
    }

    const existingWslTables = new Set(getTableHeaders(wslContent).filter(isMcpTable));
    let updated = wslContent;
    const syncedTables = [];
    const skippedExistingTables = [];
    const adaptedTables = [];

    for (const tableName of mcpTables) {
        const tableBody = extractTomlTable(windowsContent, tableName);
        if (!tableBody) {
            continue;
        }

        if (!existingWslTables.has(tableName)) {
            const nextTableBody = tableName === OMNYSYSTEM_TABLE
                ? buildWslOmnysystemTableBody(tableBody)
                : tableBody;
            updated = upsertTomlTable(updated, tableName, nextTableBody);
            syncedTables.push(tableName);
            if (tableName === OMNYSYSTEM_TABLE) {
                adaptedTables.push(tableName);
            }
            continue;
        }

        if (tableName !== OMNYSYSTEM_TABLE) {
            skippedExistingTables.push(tableName);
            continue;
        }

        const existingBody = extractTomlTable(updated, tableName);
        if (
            !existingBody ||
            (!isWindowsOnlyOmnysystemTable(existingBody) &&
                !isLegacyWslNodeBridgeTable(existingBody)) ||
            isWrapperBackedWslOmnysystemTable(existingBody)
        ) {
            skippedExistingTables.push(tableName);
            continue;
        }

        updated = upsertTomlTable(updated, tableName, buildWslOmnysystemTableBody(tableBody));
        adaptedTables.push(tableName);
    }

    if (updated === wslContent) {
        return {
            applied: false,
            reason: syncedTables.length === 0 && adaptedTables.length === 0 ? 'no_missing_wsl_mcp_tables' : 'already_synced',
            windowsConfigPath,
            wslConfigPath,
            tableCount: syncedTables.length + adaptedTables.length,
            syncedTables,
            adaptedTables,
            skippedExistingTables
        };
    }

    await fs.mkdir(path.dirname(wslConfigPath), { recursive: true });
    await fs.writeFile(wslConfigPath, updated, 'utf8');

    return {
        applied: true,
        reason: 'synced',
        windowsConfigPath,
        wslConfigPath,
        tableCount: syncedTables.length + adaptedTables.length,
        syncedTables,
        adaptedTables,
        skippedExistingTables
    };
}

export default {
    syncWindowsCodexMcpToWsl
};
