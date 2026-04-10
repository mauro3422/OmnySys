import path from 'path';
import {
    VSCODE_DAEMON_TASK_LABEL,
    VSCODE_DAEMON_TASK_COMMAND,
    SERVER_KEY,
    CONFIG_PATHS
} from './constants.js';
import {
    readJsonSafe,
    writeJsonNoBom,
    getMcpUrl,
    getHealthUrl,
    inferTargetPlatform,
    toTargetPath
} from './utils.js';
import { getWorkspaceConfigPaths, getVsCodeConfigPaths, getUnifiedConfigPath } from './paths.js';
import { getNodeCommand } from './node-command.js';
import { buildBridgePath } from './clients-helpers.js';

function buildWorkspaceBridgeServer(projectPath, includeDescription = false, options = {}) {
    const targetPlatform = options.targetPlatform || inferTargetPlatform({ projectPath });
    const bridgePath = buildBridgePath({ projectPath, targetPlatform });
    const normalizedProjectPath = toTargetPath(projectPath, { targetPlatform, projectPath });

    const server = {
        type: 'stdio',
        command: getNodeCommand({ targetPlatform, projectPath }),
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

function mapConfigPaths(paths, options = {}) {
    return Object.fromEntries(
        Object.entries(paths).map(([key, value]) => [
            key,
            toTargetPath(value, {
                targetPlatform: options.targetPlatform || inferTargetPlatform({ filePath: value }),
                filePath: value,
                projectPath: options.projectPath || ''
            })
        ])
    );
}

function buildVsCodeMcpPayload(projectPath, includeDescription = false, options = {}) {
    return {
        servers: {
            [SERVER_KEY]: {
                ...buildWorkspaceBridgeServer(projectPath, includeDescription, options)
            }
        }
    };
}

export function buildWorkspaceMcpPayload(projectPath, includeDescription = false, options = {}) {
    return {
        mcpServers: {
            [SERVER_KEY]: buildWorkspaceBridgeServer(projectPath, includeDescription, options)
        }
    };
}

export async function writeUnifiedConfig(projectPath, url) {
    const targetPath = getUnifiedConfigPath(projectPath);
    const targetPlatform = inferTargetPlatform({ projectPath });
    const payload = {
        version: 1,
        server: {
            name: SERVER_KEY,
            transport: 'stdio-bridge',
            entry: buildBridgePath({ projectPath, targetPlatform }),
            url,
            health: getHealthUrl()
        },
        targets: mapConfigPaths({
            codex: CONFIG_PATHS.codex,
            clineVsCode: CONFIG_PATHS.clineVsCode,
            clineCursor: CONFIG_PATHS.clineCursor,
            claude: CONFIG_PATHS.claude,
            opencode: CONFIG_PATHS.opencode,
            qwen: CONFIG_PATHS.qwen,
            antigravity: CONFIG_PATHS.antigravity,
            geminiCli: CONFIG_PATHS.geminiCli
        }, { projectPath }),
        workspace: mapConfigPaths(getWorkspaceConfigPaths(projectPath), { projectPath, targetPlatform }),
        vscode: mapConfigPaths(getVsCodeConfigPaths(projectPath), { projectPath, targetPlatform })
    };

    await writeJsonNoBom(targetPath, payload);
    return targetPath;
}

export function buildDaemonTask(options = {}) {
    const projectPath = path.resolve(options.projectPath || process.cwd());
    const targetPlatform = options.targetPlatform || inferTargetPlatform({ projectPath });

    return {
        label: VSCODE_DAEMON_TASK_LABEL,
        type: 'shell',
        // VS Code owns this task on Windows even when the installer runs from WSL.
        command: getNodeCommand({ targetPlatform, projectPath }),
        args: ['src/layer-c-memory/mcp-http-proxy.js'],
        options: { cwd: '${workspaceFolder}' },
        runOptions: { runOn: 'folderOpen' },
        presentation: { reveal: 'always', panel: 'dedicated', clear: false, focus: false }
    };
}

export async function applyWorkspaceMcpConfig(options = {}) {
    const projectPath = path.resolve(options.projectPath || process.cwd());
    const targetPlatform = inferTargetPlatform({ projectPath });
    const files = getWorkspaceConfigPaths(projectPath);
    const vscodeFiles = getVsCodeConfigPaths(projectPath);

    await writeJsonNoBom(files.dotMcp, buildWorkspaceMcpPayload(projectPath, false, { targetPlatform }));
    await writeJsonNoBom(files.mcpServers, buildWorkspaceMcpPayload(projectPath, false, { targetPlatform }));
    await writeJsonNoBom(vscodeFiles.mcp, buildVsCodeMcpPayload(projectPath, false, { targetPlatform }));
    await writeJsonNoBom(files.mcpServersSchema, {
        $schema: 'https://modelcontextprotocol.io/schemas/2024-11-05/mcp-servers-config.schema.json',
        ...buildWorkspaceMcpPayload(projectPath, true, { targetPlatform })
    });

    return { success: true, files };
}

export async function applyVsCodeAutostartConfig(options = {}) {
    try {
        const projectPath = path.resolve(options.projectPath || process.cwd());
        const targetPlatform = inferTargetPlatform({ projectPath });
        const paths = getVsCodeConfigPaths(projectPath);
        const daemonTask = buildDaemonTask({ projectPath, targetPlatform });

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

        await writeJsonNoBom(paths.mcp, buildVsCodeMcpPayload(projectPath, true, { targetPlatform }));

        const settings = await readJsonSafe(paths.settings, {});
        settings['task.allowAutomaticTasks'] = 'on';
        await writeJsonNoBom(paths.settings, settings);

        return { success: true, paths };
    } catch (error) {
        console.error('Error applying VS Code autostart config:', error);
        return { success: false, error: error.message };
    }
}
