import path from 'path';
import { getMcpUrl } from './utils.js';
import { CONFIG_PATHS } from './constants.js';
import { getWorkspaceConfigPaths, getVsCodeConfigPaths, getUnifiedConfigPath, getClientConfigPath } from './paths.js';
import { applyWorkspaceMcpConfig, applyVsCodeAutostartConfig, writeUnifiedConfig } from './workspace.js';
import { applyTerminalAutoStartConfig } from './terminal-autostart.js';
import {
    applyCodexConfig,
    applyClineConfig,
    applyClaudeConfig,
    applyOpenCodeConfig,
    applyQwenConfig,
    applyAntigravityConfig,
    applyGeminiCliConfig
} from './clients.js';

/**
 * Applies OmnySys MCP config to all supported clients and writes a local
 * unified config file used as reference.
 */
export async function applyUnifiedMcpConfig(options = {}) {
    const projectPath = path.resolve(options.projectPath || process.cwd());
    const mcpUrl = getMcpUrl();

    const results = [];

    const apply = async (clientName, fn) => {
        try {
            const result = await fn();
            results.push(result);
        } catch (error) {
            results.push({
                client: clientName,
                path: '',
                applied: false,
                error: error.message
            });
        }
    };

    await apply('codex', () => applyCodexConfig(mcpUrl));
    await apply('cline-vscode', () => applyClineConfig(CONFIG_PATHS.clineVsCode, mcpUrl, 'cline-vscode'));
    await apply('cline-cursor', () => applyClineConfig(CONFIG_PATHS.clineCursor, mcpUrl, 'cline-cursor'));
    await apply('claude', () => applyClaudeConfig(mcpUrl, projectPath));
    await apply('opencode', () => applyOpenCodeConfig(mcpUrl));
    await apply('qwen', () => applyQwenConfig(mcpUrl, projectPath));
    await apply('antigravity', () => applyAntigravityConfig(projectPath));
    await apply('geminiCli', () => applyGeminiCliConfig(mcpUrl));

    const unifiedConfigPath = await writeUnifiedConfig(projectPath, mcpUrl);
    const success = results.every((item) => item.applied);

    return {
        success,
        mcpUrl,
        unifiedConfigPath,
        results
    };
}

export async function standardizeMcpInstallation(options = {}) {
    const projectPath = path.resolve(options.projectPath || process.cwd());
    const clients = await applyUnifiedMcpConfig({ projectPath });
    const workspace = await applyWorkspaceMcpConfig({
        projectPath,
        mcpUrl: clients.mcpUrl
    });
    const vscode = await applyVsCodeAutostartConfig({ projectPath });
    const terminal = await applyTerminalAutoStartConfig({ projectPath });

    return {
        success: clients.success && workspace.success && vscode.success && terminal.success,
        projectPath,
        mcpUrl: clients.mcpUrl,
        unifiedConfigPath: clients.unifiedConfigPath,
        clientResults: clients.results,
        workspace,
        vscode,
        terminal
    };
}

// Re-export paths functions for external use
export { getWorkspaceConfigPaths, getVsCodeConfigPaths, getUnifiedConfigPath, getClientConfigPath };

// Re-export specific utils often used outside this standardizer (like repoRoot if needed)
export { repoRoot } from './constants.js';
