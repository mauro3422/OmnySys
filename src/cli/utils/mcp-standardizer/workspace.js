import path from 'path';
import {
    VSCODE_DAEMON_TASK_LABEL,
    VSCODE_DAEMON_TASK_COMMAND,
    SERVER_KEY,
    CONFIG_PATHS
} from './constants.js';
import { readJsonSafe, writeJsonNoBom, getMcpUrl, getHealthUrl } from './utils.js';
import { getWorkspaceConfigPaths, getVsCodeConfigPaths, getUnifiedConfigPath } from './paths.js';

export function buildWorkspaceMcpPayload(url, includeDescription = false) {
    const server = {
        type: 'http',
        url
    };

    if (includeDescription) {
        server.description = 'OmnySys shared MCP daemon (Streamable HTTP)';
    }

    return {
        mcpServers: {
            [SERVER_KEY]: server
        }
    };
}

export async function writeUnifiedConfig(projectPath, url) {
    const targetPath = getUnifiedConfigPath(projectPath);
    const payload = {
        version: 1,
        server: {
            name: SERVER_KEY,
            transport: 'streamableHttp',
            url,
            health: getHealthUrl()
        },
        targets: {
            codex: CONFIG_PATHS.codex,
            clineVsCode: CONFIG_PATHS.clineVsCode,
            clineCursor: CONFIG_PATHS.clineCursor,
            claude: CONFIG_PATHS.claude,
            opencode: CONFIG_PATHS.opencode,
            qwen: CONFIG_PATHS.qwen,
            antigravity: CONFIG_PATHS.antigravity,
            geminiCli: CONFIG_PATHS.geminiCli
        },
        workspace: getWorkspaceConfigPaths(projectPath),
        vscode: getVsCodeConfigPaths(projectPath)
    };

    await writeJsonNoBom(targetPath, payload);
    return targetPath;
}

export function buildDaemonTask() {
    return {
        label: VSCODE_DAEMON_TASK_LABEL,
        type: 'shell',
        command: VSCODE_DAEMON_TASK_COMMAND,
        options: { cwd: '${workspaceFolder}' },
        runOptions: { runOn: 'folderOpen' },
        presentation: { reveal: 'always', panel: 'dedicated', clear: false, focus: false }
    };
}

export async function applyWorkspaceMcpConfig(options = {}) {
    const projectPath = path.resolve(options.projectPath || process.cwd());
    const mcpUrl = options.mcpUrl || getMcpUrl();
    const files = getWorkspaceConfigPaths(projectPath);

    await writeJsonNoBom(files.dotMcp, buildWorkspaceMcpPayload(mcpUrl));
    await writeJsonNoBom(files.mcpServers, buildWorkspaceMcpPayload(mcpUrl));
    await writeJsonNoBom(files.mcpServersSchema, {
        $schema: 'https://modelcontextprotocol.io/schemas/2024-11-05/mcp-servers-config.schema.json',
        ...buildWorkspaceMcpPayload(mcpUrl, true)
    });

    return { success: true, files };
}

export async function applyVsCodeAutostartConfig(options = {}) {
    try {
        const projectPath = path.resolve(options.projectPath || process.cwd());
        const paths = getVsCodeConfigPaths(projectPath);
        const daemonTask = buildDaemonTask();

        const tasksConfig = await readJsonSafe(paths.tasks, { version: '2.0.0', tasks: [] });

        if (!Array.isArray(tasksConfig.tasks)) tasksConfig.tasks = [];
        if (!tasksConfig.version) tasksConfig.version = '2.0.0';

        const existingTaskIndex = tasksConfig.tasks.findIndex(
            (task) => task?.label === VSCODE_DAEMON_TASK_LABEL || task?.command === VSCODE_DAEMON_TASK_COMMAND
        );

        if (existingTaskIndex >= 0) {
            const existing = tasksConfig.tasks[existingTaskIndex] || {};
            tasksConfig.tasks[existingTaskIndex] = {
                ...existing,
                ...daemonTask,
                options: { ...(existing.options || {}), ...(daemonTask.options || {}) },
                runOptions: { ...(existing.runOptions || {}), ...(daemonTask.runOptions || {}) },
                presentation: { ...(existing.presentation || {}), ...(daemonTask.presentation || {}) }
            };
        } else {
            tasksConfig.tasks.push(daemonTask);
        }

        await writeJsonNoBom(paths.tasks, tasksConfig);

        const settings = await readJsonSafe(paths.settings, {});
        settings['task.allowAutomaticTasks'] = 'on';
        await writeJsonNoBom(paths.settings, settings);

        return { success: true, paths };
    } catch (error) {
        console.error('Error applying VS Code autostart config:', error);
        return { success: false, error: error.message };
    }
}
