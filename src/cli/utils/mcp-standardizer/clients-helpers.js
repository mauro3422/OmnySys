import path from 'path';
import { repoRoot } from './constants.js';
import { getHealthUrl, normalizeSlashes } from './utils.js';
import { getNodeCommand } from './node-command.js';

export function buildBridgePath() {
    return normalizeSlashes(path.join(repoRoot, 'src', 'layer-c-memory', 'mcp-stdio-bridge.js'));
}

export function buildBridgeEnv(url, projectPath) {
    return {
        OMNYSYS_DAEMON_URL: url,
        OMNYSYS_HEALTH_URL: getHealthUrl(),
        OMNYSYS_AUTO_START: '1',
        OMNYSYS_PROJECT_PATH: normalizeSlashes(projectPath),
        OMNYSYS_CLIENT_ID: 'codex',
        OMNYSYS_CLIENT_NAME: 'codex'
    };
}

export function normalizeCodexProjectPath(projectPath) {
    return path.resolve(projectPath).replace(/^\\\\\?\\/, '');
}

export function getCodexProjectTrustTableNames(projectPath) {
    const normalizedProjectPath = normalizeCodexProjectPath(projectPath);
    const tableNames = [`projects.'${normalizedProjectPath}'`];

    if (/^[A-Za-z]:\\/.test(normalizedProjectPath)) {
        tableNames.push(`projects.'\\\\?\\${normalizedProjectPath}'`);
    }

    return tableNames;
}

export function buildCodexTableBody(url, projectPath) {
    const bridgePath = buildBridgePath();
    const nodeCommand = getNodeCommand();
    const normalizedProjectPath = normalizeSlashes(projectPath);
    const env = buildBridgeEnv(url, normalizedProjectPath);
    const envEntries = [
        ['OMNYSYS_DAEMON_URL', env.OMNYSYS_DAEMON_URL],
        ['OMNYSYS_HEALTH_URL', env.OMNYSYS_HEALTH_URL],
        ['OMNYSYS_AUTO_START', env.OMNYSYS_AUTO_START],
        ['OMNYSYS_PROJECT_PATH', env.OMNYSYS_PROJECT_PATH],
        ['OMNYSYS_CLIENT_ID', env.OMNYSYS_CLIENT_ID],
        ['OMNYSYS_CLIENT_NAME', env.OMNYSYS_CLIENT_NAME]
    ];

    return [
        'type = "stdio"',
        `command = "${nodeCommand}"`,
        `args = ["${bridgePath}"]`,
        `cwd = "${normalizedProjectPath}"`,
        'startup_timeout_sec = 120',
        `env = { ${envEntries.map(([key, value]) => `${key} = "${value}"`).join(', ')} }`
    ];
}

export function buildCodexProjectTableName(projectPath) {
    return getCodexProjectTrustTableNames(projectPath)[0];
}

export function removeTomlTable(content, tableName) {
    const lines = String(content || '').split(/\r?\n/);
    const header = `[${tableName}]`;
    const start = lines.findIndex((line) => line.trim() === header);

    if (start === -1) {
        return String(content || '');
    }

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].trim().startsWith('[') && lines[i].trim().endsWith(']')) {
            end = i;
            break;
        }
    }

    return [...lines.slice(0, start), ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
