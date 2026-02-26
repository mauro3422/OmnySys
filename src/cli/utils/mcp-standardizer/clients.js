import fs from 'fs/promises';
import path from 'path';
import { CONFIG_PATHS, SERVER_KEY, LEGACY_SERVER_KEYS, repoRoot } from './constants.js';
import {
    readJsonSafe,
    writeJsonNoBom,
    ensureMcpServersContainer,
    getPrimaryWithLegacyFallback,
    clearLegacyAliases,
    upsertTomlTable,
    stripBom,
    normalizeSlashes
} from './utils.js';

export async function applyCodexConfig(url) {
    const targetPath = CONFIG_PATHS.codex;
    let content = '';

    try {
        content = stripBom(await fs.readFile(targetPath, 'utf8'));
    } catch {
        content = '';
    }

    const updated = upsertTomlTable(content, `mcp_servers.${SERVER_KEY}`, [`url = "${url}"`]);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, updated, 'utf8');

    return { client: 'codex', path: targetPath, applied: true };
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

    const globalServers = ensureMcpServersContainer(config);
    const existingGlobal = getPrimaryWithLegacyFallback(globalServers);

    globalServers[SERVER_KEY] = {
        ...(existingGlobal || {}),
        httpUrl: url,
        timeout: typeof existingGlobal?.timeout === 'number' ? existingGlobal.timeout : 30000
    };
    clearLegacyAliases(globalServers);

    const projectQwenDir = path.join(projectPath, '.qwen');
    const projectConfigPath = path.join(projectQwenDir, 'settings.json');

    const projectConfig = {
        mcpServers: {
            [SERVER_KEY]: {
                httpUrl: url,
                timeout: 30000
            }
        }
    };

    await fs.mkdir(projectQwenDir, { recursive: true });
    await writeJsonNoBom(projectConfigPath, projectConfig);

    return { client: 'qwen', path: targetPath, applied: true, projectConfigPath };
}

export async function applyAntigravityConfig(projectPath) {
    const targetPath = CONFIG_PATHS.antigravity;
    const bridgePath = path.join(repoRoot, 'src', 'layer-c-memory', 'mcp-stdio-bridge.js');
    const config = await readJsonSafe(targetPath, { mcpServers: {} });

    const mcpServers = ensureMcpServersContainer(config);
    clearLegacyAliases(mcpServers);
    mcpServers[SERVER_KEY] = {
        command: 'node',
        args: [normalizeSlashes(bridgePath)]
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
