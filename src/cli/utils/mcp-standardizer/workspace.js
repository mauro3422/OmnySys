import path from 'path';
import {
    VSCODE_DAEMON_TASK_LABEL,
    VSCODE_DAEMON_TASK_COMMAND,
    SERVER_KEY,
    CONFIG_PATHS,
    repoRoot
} from './constants.js';
import { readJsonSafe, writeJsonNoBom, getMcpUrl, getHealthUrl, normalizeSlashes } from './utils.js';
import { getWorkspaceConfigPaths, getVsCodeConfigPaths, getUnifiedConfigPath } from './paths.js';

function getNodeCommand() {
    return normalizeSlashes(process.execPath);
}

function buildWorkspaceBridgeServer(projectPath, includeDescription = false) {
    const bridgePath = normalizeSlashes(path.join(repoRoot, 'src', 'layer-c-memory', 'mcp-stdio-bridge.js'));
    const normalizedProjectPath = normalizeSlashes(projectPath);

    const server = {
        type: 'stdio',
        command: getNodeCommand(),
        args: [bridgePath],
        cwd: normalizedProjectPath,
        env: {
            OMNYSYS_DAEMON_URL: getMcpUrl(),
            OMNYSYS_HEALTH_URL: getHealthUrl(),
            OMNYSYS_AUTO_START: '1',
            OMNYSYS_PROJECT_PATH: normalizedProjectPath
        }
    };

    if (includeDescription) {
        server.description = 'OmnySys MCP bridge with auto-start';
    }

    return server;
}

export function buildWorkspaceMcpPayload(projectPath, includeDescription = false) {
    return {
        mcpServers: {
            [SERVER_KEY]: buildWorkspaceBridgeServer(projectPath, includeDescription)
        }
    };
}

export async function writeUnifiedConfig(projectPath, url) {
    const targetPath = getUnifiedConfigPath(projectPath);
    const payload = {
        version: 1,
        server: {
            name: SERVER_KEY,
            transport: 'stdio-bridge',
            entry: normalizeSlashes(path.join(repoRoot, 'src', 'layer-c-memory', 'mcp-stdio-bridge.js')),
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
    const files = getWorkspaceConfigPaths(projectPath);

    await writeJsonNoBom(files.dotMcp, buildWorkspaceMcpPayload(projectPath));
    await writeJsonNoBom(files.mcpServers, buildWorkspaceMcpPayload(projectPath));
    await writeJsonNoBom(files.mcpServersSchema, {
        $schema: 'https://modelcontextprotocol.io/schemas/2024-11-05/mcp-servers-config.schema.json',
        ...buildWorkspaceMcpPayload(projectPath, true)
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

