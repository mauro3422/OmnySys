import path from 'path';
import { WORKSPACE_FILES, VSCODE_FILES, UNIFIED_CONFIG_FILE, CONFIG_PATHS } from './constants.js';

export function getWorkspaceConfigPaths(projectPath = process.cwd()) {
    const resolved = path.resolve(projectPath);
    return {
        dotMcp: path.join(resolved, WORKSPACE_FILES.dotMcp),
        mcpServers: path.join(resolved, WORKSPACE_FILES.mcpServers),
        mcpServersSchema: path.join(resolved, WORKSPACE_FILES.mcpServersSchema)
    };
}

export function getVsCodeConfigPaths(projectPath = process.cwd()) {
    const resolved = path.resolve(projectPath);
    return {
        tasks: path.join(resolved, VSCODE_FILES.tasks),
        settings: path.join(resolved, VSCODE_FILES.settings)
    };
}

export function getUnifiedConfigPath(projectPath = process.cwd()) {
    return path.join(path.resolve(projectPath), UNIFIED_CONFIG_FILE);
}

export function getClientConfigPath(client) {
    return CONFIG_PATHS[client] || '';
}
