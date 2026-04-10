import path from 'path';
import { repoRoot } from './constants.js';
import { getHealthUrl, inferTargetPlatform, toTargetPath } from './utils.js';
import { getNodeCommand } from './node-command.js';

function resolveTargetPlatform(options = {}) {
    return options.targetPlatform || inferTargetPlatform({
        filePath: options.filePath || '',
        projectPath: options.projectPath || ''
    });
}

export function buildBridgePath(options = {}) {
    const targetPlatform = resolveTargetPlatform(options);
    return toTargetPath(path.join(repoRoot, 'src', 'layer-c-memory', 'mcp-stdio-bridge.js'), {
        targetPlatform,
        projectPath: options.projectPath || ''
    });
}

export function buildBridgeEnv(url, projectPath, options = {}) {
    const targetPlatform = resolveTargetPlatform({
        ...options,
        projectPath
    });

    return {
        OMNYSYS_DAEMON_URL: url,
        OMNYSYS_HEALTH_URL: getHealthUrl(),
        OMNYSYS_AUTO_START: '1',
        OMNYSYS_PROJECT_PATH: toTargetPath(projectPath, {
            targetPlatform,
            projectPath
        }),
        OMNYSYS_CLIENT_ID: 'codex',
        OMNYSYS_CLIENT_NAME: 'codex'
    };
}

export function normalizeCodexProjectPath(projectPath) {
    return path.resolve(projectPath).replace(/^\\\\\?\\/, '');
}

function escapeTomlBasicString(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function getCodexProjectTrustTableNames(projectPath) {
    const normalizedProjectPath = normalizeCodexProjectPath(projectPath);
    const tableNames = [
        `projects.'${normalizedProjectPath}'`,
        `projects."${escapeTomlBasicString(normalizedProjectPath)}"`
    ];

    if (/^[A-Za-z]:\\/.test(normalizedProjectPath)) {
        const namespacedPath = `\\\\?\\${normalizedProjectPath}`;
        tableNames.push(`projects.'${namespacedPath}'`);
        tableNames.push(`projects."${escapeTomlBasicString(namespacedPath)}"`);
    }

    return Array.from(new Set(tableNames));
}

export function buildCodexTableBody(url, projectPath, options = {}) {
    // The standardized installer writes configs for mixed Windows + WSL clients.
    // The serialized command/path values must match the client consuming them,
    // not whichever runtime happened to execute install.js.
    const targetPlatform = resolveTargetPlatform({
        ...options,
        projectPath
    });
    const bridgePath = buildBridgePath({
        ...options,
        projectPath,
        targetPlatform
    });
    const nodeCommand = getNodeCommand({
        ...options,
        projectPath,
        targetPlatform
    });
    const normalizedProjectPath = toTargetPath(projectPath, {
        targetPlatform,
        projectPath
    });
    const env = buildBridgeEnv(url, normalizedProjectPath, {
        ...options,
        projectPath: normalizedProjectPath,
        targetPlatform
    });
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
