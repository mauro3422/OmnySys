import fs from 'fs/promises';
import path from 'path';
import { CONFIG_PATHS, SERVER_KEY, LEGACY_SERVER_KEYS, repoRoot } from './constants.js';
import {
    getHealthUrl,
    readJsonSafe,
    writeJsonNoBom,
    ensureMcpServersContainer,
    getPrimaryWithLegacyFallback,
    clearLegacyAliases,
    upsertTomlTable,
    stripBom,
    normalizeSlashes
} from './utils.js';
import { getNodeCommand } from './node-command.js';

function buildBridgePath() {
    return normalizeSlashes(path.join(repoRoot, 'src', 'layer-c-memory', 'mcp-stdio-bridge.js'));
}

function buildBridgeEnv(url, projectPath) {
    return {
        OMNYSYS_DAEMON_URL: url,
        OMNYSYS_HEALTH_URL: getHealthUrl(),
        OMNYSYS_AUTO_START: '1',
        OMNYSYS_PROJECT_PATH: normalizeSlashes(projectPath)
    };
}

function buildCodexTableBody(url, projectPath) {
    const bridgePath = buildBridgePath();
    const nodeCommand = getNodeCommand();
    const normalizedProjectPath = normalizeSlashes(projectPath);
    const env = buildBridgeEnv(url, normalizedProjectPath);

    return [
        'type = "stdio"',
        `command = "${nodeCommand}"`,
        `args = ["${bridgePath}"]`,
        `cwd = "${normalizedProjectPath}"`,
        'startup_timeout_sec = 120',
        `env = { OMNYSYS_DAEMON_URL = "${env.OMNYSYS_DAEMON_URL}", OMNYSYS_HEALTH_URL = "${env.OMNYSYS_HEALTH_URL}", OMNYSYS_AUTO_START = "${env.OMNYSYS_AUTO_START}", OMNYSYS_PROJECT_PATH = "${env.OMNYSYS_PROJECT_PATH}" }`
    ];
}

function buildCodexProjectTableName(projectPath) {
    return `projects.'${path.resolve(projectPath)}'`;
}

function removeTomlTable(content, tableName) {
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

export async function applyCodexConfig(url, projectPath = repoRoot) {
    const targetPath = CONFIG_PATHS.codex;
    const projectConfigPath = path.join(projectPath, '.codex', 'config.toml');
    const codexTableBody = buildCodexTableBody(url, projectPath);
    let content = '';

    try {
        content = stripBom(await fs.readFile(targetPath, 'utf8'));
    } catch {
        content = '';
    }

    content = removeTomlTable(content, `mcp.servers.${SERVER_KEY}`);

    let updated = upsertTomlTable(content, `mcp_servers.${SERVER_KEY}`, codexTableBody);
    updated = upsertTomlTable(updated, buildCodexProjectTableName(projectPath), ['trust_level = "trusted"']);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, updated, 'utf8');

    let projectContent = '';
    try {
        projectContent = stripBom(await fs.readFile(projectConfigPath, 'utf8'));
    } catch {
        projectContent = '';
    }

    const updatedProject = upsertTomlTable(projectContent, `mcp_servers.${SERVER_KEY}`, codexTableBody);
    await fs.mkdir(path.dirname(projectConfigPath), { recursive: true });
    await fs.writeFile(projectConfigPath, updatedProject, 'utf8');

    return {
        client: 'codex',
        path: targetPath,
        applied: true,
        projectConfigPath
    };
}

export async function applyClineConfig(filePath, url, clientName) {
    if (!filePath) {
        return { client: clientName, path: '', applied: true, skipped: true };
    }

    const config = await readJsonSafe(filePath, { mcpServers: {} });
    const mcpServers = ensureMcpServersContainer(config);
    const existing = getPrimaryWithLegacyFallback(mcpServers);

    mcpServers[SERVER_KEY] = {
        ...(existing || {}),
        type: 'streamableHttp',
        url,
        disabled: false,
        autoApprove: Array.isArray(existing?.autoApprove) ? existing.autoApprove : []
    };

    clearLegacyAliases(mcpServers);
    await writeJsonNoBom(filePath, config);

    return { client: clientName, path: filePath, applied: true };
}

export async function applyClaudeConfig(url, projectPath) {
    try {
        const targetPath = CONFIG_PATHS.claude;
        const config = await readJsonSafe(targetPath, {});

        const globalServers = ensureMcpServersContainer(config);
        const existingGlobal = getPrimaryWithLegacyFallback(globalServers);
        globalServers[SERVER_KEY] = {
            ...(existingGlobal || {}),
            type: 'http',
            url,
            disabled: false
        };
        clearLegacyAliases(globalServers);

        if (!config.projects || typeof config.projects !== 'object') {
            config.projects = {};
        }

        const normalizedProjectPath = normalizeSlashes(projectPath);
        if (!config.projects[normalizedProjectPath] || typeof config.projects[normalizedProjectPath] !== 'object') {
            config.projects[normalizedProjectPath] = {};
        }

        const projectServers = ensureMcpServersContainer(config.projects[normalizedProjectPath]);
        const existingProject = getPrimaryWithLegacyFallback(projectServers);
        projectServers[SERVER_KEY] = {
            ...(existingProject || {}),
            type: 'http',
            url,
            disabled: false
        };
        clearLegacyAliases(projectServers);

        await writeJsonNoBom(targetPath, config);

        return { client: 'claude', path: targetPath, applied: true };
    } catch (error) {
        console.error('Error applying Claude config:', error);
        return { client: 'claude', path: CONFIG_PATHS.claude, applied: false, error: error.message };
    }
}

export async function applyOpenCodeConfig(url) {
    try {
        const targetPath = CONFIG_PATHS.opencode;
        const config = await readJsonSafe(targetPath, {});

        if (!config.mcp || typeof config.mcp !== 'object') {
            config.mcp = {};
        }

        const existing = getPrimaryWithLegacyFallback(config.mcp);
        config.mcp[SERVER_KEY] = {
            type: 'remote',
            url,
            enabled: existing?.enabled !== false,
            timeout: typeof existing?.timeout === 'number' ? existing.timeout : 30000
        };
        clearLegacyAliases(config.mcp);

        if (config.mcpServers && typeof config.mcpServers === 'object') {
            delete config.mcpServers[SERVER_KEY];
            for (const legacyKey of LEGACY_SERVER_KEYS) {
                delete config.mcpServers[legacyKey];
            }
            if (Object.keys(config.mcpServers).length === 0) {
                delete config.mcpServers;
            }
        }

        await writeJsonNoBom(targetPath, config);

        return { client: 'opencode', path: targetPath, applied: true };
    } catch (error) {
        console.error('Error applying OpenCode config:', error);
        return { client: 'opencode', path: CONFIG_PATHS.opencode, applied: false, error: error.message };
    }
}

export async function applyQwenConfig(url, projectPath) {
    const targetPath = CONFIG_PATHS.qwen;
    const config = await readJsonSafe(targetPath, {});
    const bridgePath = buildBridgePath();
    const nodeCommand = getNodeCommand();
    const env = buildBridgeEnv(url, projectPath);

    const globalServers = ensureMcpServersContainer(config);
    globalServers[SERVER_KEY] = {
        command: nodeCommand,
        args: [bridgePath],
        env
    };
    clearLegacyAliases(globalServers);

    if (!config.mcp || typeof config.mcp !== 'object') {
        config.mcp = {};
    }
    if (!Array.isArray(config.mcp.allowed)) {
        config.mcp.allowed = [];
    }
    if (!config.mcp.allowed.includes(SERVER_KEY)) {
        config.mcp.allowed.push(SERVER_KEY);
    }

    await writeJsonNoBom(targetPath, config);

    const projectQwenDir = path.join(projectPath, '.qwen');
    const projectConfigPath = path.join(projectQwenDir, 'settings.json');

    const projectConfig = {
        mcpServers: {
            [SERVER_KEY]: {
                command: nodeCommand,
                args: [bridgePath],
                env
            }
        },
        mcp: {
            allowed: [SERVER_KEY]
        },
        $version: 3
    };

    await fs.mkdir(projectQwenDir, { recursive: true });
    await writeJsonNoBom(projectConfigPath, projectConfig);

    return { client: 'qwen', path: targetPath, applied: true, projectConfigPath };
}

export async function applyAntigravityConfig(projectPath) {
    const targetPath = CONFIG_PATHS.antigravity;
    const bridgePath = buildBridgePath();
    const nodeCommand = getNodeCommand();
    const env = buildBridgeEnv('http://127.0.0.1:9999/mcp', projectPath);
    const config = await readJsonSafe(targetPath, { mcpServers: {} });

    const mcpServers = ensureMcpServersContainer(config);
    clearLegacyAliases(mcpServers);
    mcpServers[SERVER_KEY] = {
        command: nodeCommand,
        args: [bridgePath],
        env
    };

    await writeJsonNoBom(targetPath, config);

    return { client: 'antigravity', path: targetPath, applied: true };
}

export async function applyGeminiCliConfig(url) {
    const targetPath = CONFIG_PATHS.geminiCli;
    const config = await readJsonSafe(targetPath, {});

    const mcpServers = ensureMcpServersContainer(config);
    const existing = getPrimaryWithLegacyFallback(mcpServers);
    mcpServers[SERVER_KEY] = {
        ...(existing || {}),
        httpUrl: url
    };
    clearLegacyAliases(mcpServers);

    if (!config.mcp || typeof config.mcp !== 'object') config.mcp = {};
    if (!Array.isArray(config.mcp.allowed)) config.mcp.allowed = [];
    if (!config.mcp.allowed.includes(SERVER_KEY)) {
        config.mcp.allowed.push(SERVER_KEY);
    }

    await writeJsonNoBom(targetPath, config);

    return { client: 'geminiCli', path: targetPath, applied: true };
}
