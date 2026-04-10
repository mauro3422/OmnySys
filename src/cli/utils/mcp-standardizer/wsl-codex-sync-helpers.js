import path from 'path';

const OMNYSYSTEM_TABLE = 'mcp_servers.omnysystem';

export function getTableHeaders(content = '') {
    return String(content)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith('[') && line.endsWith(']'))
        .map((line) => line.slice(1, -1));
}

export function extractTomlTable(content, tableName) {
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

export function isMcpTable(tableName = '') {
    return tableName.startsWith('mcp_servers.');
}

export function windowsPathToWsl(filePath = '') {
    const normalized = String(filePath || '').trim().replace(/\\/g, '/');
    const driveMatch = normalized.match(/^([A-Za-z]):\/(.*)$/);
    if (!driveMatch) {
        return normalized;
    }

    const [, drive, rest] = driveMatch;
    return `/mnt/${drive.toLowerCase()}/${rest}`;
}

export function getTomlStringValue(lines = [], key = '') {
    const matcher = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*"([^"]*)"\\s*$`);
    for (const line of lines) {
        const match = String(line).match(matcher);
        if (match) {
            return match[1];
        }
    }
    return '';
}

export function getTomlNumberValue(lines = [], key = '') {
    const matcher = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(\\d+)\\s*$`);
    for (const line of lines) {
        const match = String(line).match(matcher);
        if (match) {
            return Number(match[1]);
        }
    }
    return null;
}

export function getTomlBooleanValue(lines = [], key = '') {
    const matcher = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(true|false)\\s*$`);
    for (const line of lines) {
        const match = String(line).match(matcher);
        if (match) {
            return match[1] === 'true';
        }
    }
    return null;
}

export function getTomlArrayValues(lines = [], key = '') {
    const matcher = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*\\[(.*)\\]\\s*$`);
    for (const line of lines) {
        const match = String(line).match(matcher);
        if (match) {
            return Array.from(match[1].matchAll(/"([^"]*)"/g), (entry) => entry[1]);
        }
    }
    return [];
}

export function getTomlInlineTableMap(lines = [], key = '') {
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

export function stringifyInlineTable(map = {}) {
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

export function buildWslOmnysystemTableBody(tableBody = [], runtime = {}) {
    const env = getTomlInlineTableMap(tableBody, 'env');
    const projectPath = resolveOmnysystemProjectPath(tableBody);
    const launcherPath = path.posix.join(projectPath, 'scripts', 'mcp', 'omnysystem-wsl-bridge.sh');
    const startupTimeout = getTomlNumberValue(tableBody, 'startup_timeout_sec') || 120;
    const enabled = getTomlBooleanValue(tableBody, 'enabled');
    const clientId = env.OMNYSYS_CLIENT_ID || 'codex';

    const nextEnv = {
        ...env,
        // The WSL launcher execs Windows node.exe, so the bridge still talks to
        // the daemon from the Windows side and should keep loopback URLs.
        OMNYSYS_DAEMON_URL: env.OMNYSYS_DAEMON_URL || 'http://127.0.0.1:9999/mcp',
        OMNYSYS_HEALTH_URL: env.OMNYSYS_HEALTH_URL || 'http://127.0.0.1:9999/health',
        OMNYSYS_AUTO_START: '0',
        OMNYSYS_PROJECT_PATH: projectPath,
        OMNYSYS_CLIENT_ID: clientId,
        OMNYSYS_CLIENT_NAME: env.OMNYSYS_CLIENT_NAME || 'codex',
        OMNYSYS_CLIENT_ROUTE_BASE: env.OMNYSYS_CLIENT_ROUTE_BASE || `${clientId}-wsl`
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

export function isWrapperBackedWslOmnysystemTable(tableBody = []) {
    const command = getTomlStringValue(tableBody, 'command');
    const args = getTomlArrayValues(tableBody, 'args');
    return command === 'bash' && args[0]?.endsWith('/scripts/mcp/omnysystem-wsl-bridge.sh');
}

export function shouldRefreshWrapperBackedWslOmnysystemTable(tableBody = []) {
    if (!isWrapperBackedWslOmnysystemTable(tableBody)) {
        return false;
    }

    const env = getTomlInlineTableMap(tableBody, 'env');
    return !String(env.OMNYSYS_CLIENT_ROUTE_BASE || '').trim();
}

export function isLegacyWslNodeBridgeTable(tableBody = []) {
    const command = getTomlStringValue(tableBody, 'command');
    const args = getTomlArrayValues(tableBody, 'args');
    const normalizedCommand = path.posix.basename(String(command || '').trim());
    const bridgePath = String(args[0] || '').trim();

    return (normalizedCommand === 'node' || normalizedCommand === 'node.exe')
        && bridgePath.endsWith('/src/layer-c-memory/mcp-stdio-bridge.js');
}

export function isWindowsOnlyOmnysystemTable(tableBody = []) {
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

export {
    OMNYSYSTEM_TABLE
};
