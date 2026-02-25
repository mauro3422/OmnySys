/**
 * @fileoverview Unified MCP client standardizer
 *
 * Single source of truth for OmnySys MCP installation/config across:
 * - Codex
 * - Cline (VS Code / Cursor)
 * - Claude CLI
 * - OpenCode
 * - Workspace MCP files
 * - VS Code daemon autostart
 *
 * @module cli/utils/mcp-client-standardizer
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORTS } from './port-checker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, '../../..');

const SERVER_KEY = 'omnysystem';
const LEGACY_SERVER_KEYS = ['omnysys', 'omny-system'];
const UNIFIED_CONFIG_FILE = 'mcp-unified.config.json';
const APPDATA_DIR = process.env.APPDATA || '';
const MCP_SCHEMA_URL = 'https://modelcontextprotocol.io/schemas/2024-11-05/mcp-servers-config.schema.json';

const WORKSPACE_FILES = {
  dotMcp: '.mcp.json',
  mcpServers: 'mcp-servers.json',
  mcpServersSchema: 'mcp-servers.schema.json'
};

const VSCODE_FILES = {
  tasks: path.join('.vscode', 'tasks.json'),
  settings: path.join('.vscode', 'settings.json')
};

const VSCODE_DAEMON_TASK_LABEL = 'OmnySys MCP Daemon';
const VSCODE_DAEMON_TASK_COMMAND = 'node src/layer-c-memory/mcp-http-server.js';

const CONFIG_PATHS = {
  codex: path.join(os.homedir(), '.codex', 'config.toml'),
  clineVsCode: APPDATA_DIR
    ? path.join(
      APPDATA_DIR,
      'Code',
      'User',
      'globalStorage',
      'saoudrizwan.claude-dev',
      'settings',
      'cline_mcp_settings.json'
    )
    : '',
  clineCursor: APPDATA_DIR
    ? path.join(
      APPDATA_DIR,
      'Cursor',
      'User',
      'globalStorage',
      'saoudrizwan.claude-dev',
      'settings',
      'cline_mcp_settings.json'
    )
    : '',
  claude: path.join(os.homedir(), '.claude.json'),
  opencode: path.join(os.homedir(), '.config', 'opencode', 'opencode.json'),
  qwen: path.join(os.homedir(), '.qwen', 'settings.json'),
  antigravity: path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json'),
  geminiCli: path.join(os.homedir(), '.gemini', 'settings.json')
};

function getMcpUrl() {
  return `http://127.0.0.1:${PORTS.mcp}/mcp`;
}

function getHealthUrl() {
  return `http://127.0.0.1:${PORTS.mcp}/health`;
}

function normalizeSlashes(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function stripBom(text) {
  if (typeof text !== 'string') return '';
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readJsonSafe(filePath, fallback = {}) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const cleaned = stripBom(raw).trim();
    if (!cleaned) return cloneObject(fallback);
    return JSON.parse(cleaned);
  } catch {
    return cloneObject(fallback);
  }
}

async function writeJsonNoBom(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function ensureMcpServersContainer(config) {
  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    config.mcpServers = {};
  }
  return config.mcpServers;
}

function getPrimaryWithLegacyFallback(mcpServers) {
  if (!mcpServers || typeof mcpServers !== 'object') return {};

  const primary = mcpServers[SERVER_KEY];
  if (primary && typeof primary === 'object') return primary;

  for (const legacyKey of LEGACY_SERVER_KEYS) {
    const legacy = mcpServers[legacyKey];
    if (legacy && typeof legacy === 'object') return legacy;
  }

  return {};
}

function clearLegacyAliases(mcpServers) {
  for (const legacyKey of LEGACY_SERVER_KEYS) {
    delete mcpServers[legacyKey];
  }
}

function upsertTomlTable(content, tableName, tableBody) {
  const lines = content.split(/\r?\n/);
  const header = `[${tableName}]`;

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === header) {
      start = i;
      break;
    }
  }

  const bodyLines = [header, ...tableBody];

  if (start === -1) {
    const trimmed = content.trim();
    const separator = trimmed.length > 0 ? '\n\n' : '';
    return `${trimmed}${separator}${bodyLines.join('\n')}\n`;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('[') && lines[i].trim().endsWith(']')) {
      end = i;
      break;
    }
  }

  const next = [...lines.slice(0, start), ...bodyLines, ...lines.slice(end)];
  return `${next.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

async function applyCodexConfig(url) {
  const targetPath = CONFIG_PATHS.codex;
  let content = '';

  try {
    content = stripBom(await fs.readFile(targetPath, 'utf8'));
  } catch {
    content = '';
  }

  const updated = upsertTomlTable(content, `mcp_servers.${SERVER_KEY}`, [
    `url = "${url}"`
  ]);

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, updated, 'utf8');

  return {
    client: 'codex',
    path: targetPath,
    applied: true
  };
}

async function applyClineConfig(filePath, url, clientName) {
  if (!filePath) {
    return {
      client: clientName,
      path: '',
      applied: true,
      skipped: true
    };
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

  return {
    client: clientName,
    path: filePath,
    applied: true
  };
}

async function applyClaudeConfig(url, projectPath) {
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

  return {
    client: 'claude',
    path: targetPath,
    applied: true
  };
}

async function applyOpenCodeConfig(url) {
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

  // Keep OpenCode config clean and avoid conflicting legacy blocks.
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

  return {
    client: 'opencode',
    path: targetPath,
    applied: true
  };
}

async function applyQwenConfig(url, projectPath) {
  const targetPath = CONFIG_PATHS.qwen;
  const config = await readJsonSafe(targetPath, {});

  // Qwen Code uses mcpServers object with httpUrl or url for HTTP transport
  const globalServers = ensureMcpServersContainer(config);
  const existingGlobal = getPrimaryWithLegacyFallback(globalServers);

  globalServers[SERVER_KEY] = {
    ...(existingGlobal || {}),
    httpUrl: url,
    timeout: typeof existingGlobal?.timeout === 'number' ? existingGlobal.timeout : 30000
  };
  clearLegacyAliases(globalServers);

  // Project-level config in .qwen/settings.json within project
  const projectQwenDir = path.join(projectPath, '.qwen');
  const projectConfigPath = path.join(projectQwenDir, 'settings.json');
  const normalizedProjectPath = normalizeSlashes(projectPath);

  // Also write project-level config for Qwen to pick up in workspace context
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

  return {
    client: 'qwen',
    path: targetPath,
    applied: true,
    projectConfigPath
  };
}

async function applyAntigravityConfig(projectPath) {
  const targetPath = CONFIG_PATHS.antigravity;
  // Bridge path is relative to where the package is installed
  const bridgePath = path.join(repoRoot, 'src', 'layer-c-memory', 'mcp-stdio-bridge.js');
  const config = await readJsonSafe(targetPath, { mcpServers: {} });

  const mcpServers = ensureMcpServersContainer(config);
  clearLegacyAliases(mcpServers);
  mcpServers[SERVER_KEY] = {
    command: 'node',
    args: [normalizeSlashes(bridgePath)]
  };

  await writeJsonNoBom(targetPath, config);

  return {
    client: 'antigravity',
    path: targetPath,
    applied: true
  };
}

async function applyGeminiCliConfig(url) {
  const targetPath = CONFIG_PATHS.geminiCli;
  const config = await readJsonSafe(targetPath, {});

  const mcpServers = ensureMcpServersContainer(config);
  const existing = getPrimaryWithLegacyFallback(mcpServers);
  mcpServers[SERVER_KEY] = {
    ...(existing || {}),
    httpUrl: url
  };
  clearLegacyAliases(mcpServers);

  // Ensure omnysys is in the allowed list
  if (!config.mcp || typeof config.mcp !== 'object') config.mcp = {};
  if (!Array.isArray(config.mcp.allowed)) config.mcp.allowed = [];
  if (!config.mcp.allowed.includes(SERVER_KEY)) {
    config.mcp.allowed.push(SERVER_KEY);
  }

  await writeJsonNoBom(targetPath, config);

  return {
    client: 'geminiCli',
    path: targetPath,
    applied: true
  };
}

function buildWorkspaceMcpPayload(url, includeDescription = false) {
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

async function writeUnifiedConfig(projectPath, url) {
  const targetPath = path.join(projectPath, UNIFIED_CONFIG_FILE);
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

function buildDaemonTask() {
  return {
    label: VSCODE_DAEMON_TASK_LABEL,
    type: 'shell',
    command: VSCODE_DAEMON_TASK_COMMAND,
    options: {
      cwd: '${workspaceFolder}'
    },
    runOptions: {
      runOn: 'folderOpen'
    },
    presentation: {
      reveal: 'always',
      panel: 'dedicated',
      clear: false,
      focus: false
    }
  };
}

export async function applyWorkspaceMcpConfig(options = {}) {
  const projectPath = path.resolve(options.projectPath || process.cwd());
  const mcpUrl = options.mcpUrl || getMcpUrl();
  const files = getWorkspaceConfigPaths(projectPath);

  await writeJsonNoBom(files.dotMcp, buildWorkspaceMcpPayload(mcpUrl));
  await writeJsonNoBom(files.mcpServers, buildWorkspaceMcpPayload(mcpUrl));
  await writeJsonNoBom(files.mcpServersSchema, {
    $schema: MCP_SCHEMA_URL,
    ...buildWorkspaceMcpPayload(mcpUrl, true)
  });

  return {
    success: true,
    files
  };
}

export async function applyVsCodeAutostartConfig(options = {}) {
  try {
    const projectPath = path.resolve(options.projectPath || process.cwd());
    const paths = getVsCodeConfigPaths(projectPath);
    const daemonTask = buildDaemonTask();

    const tasksConfig = await readJsonSafe(paths.tasks, {
      version: '2.0.0',
      tasks: []
    });

    if (!Array.isArray(tasksConfig.tasks)) {
      tasksConfig.tasks = [];
    }
    if (!tasksConfig.version) {
      tasksConfig.version = '2.0.0';
    }

    const existingTaskIndex = tasksConfig.tasks.findIndex(
      (task) =>
        task?.label === VSCODE_DAEMON_TASK_LABEL ||
        task?.command === VSCODE_DAEMON_TASK_COMMAND
    );

    if (existingTaskIndex >= 0) {
      const existing = tasksConfig.tasks[existingTaskIndex] || {};
      tasksConfig.tasks[existingTaskIndex] = {
        ...existing,
        ...daemonTask,
        options: {
          ...(existing.options || {}),
          ...(daemonTask.options || {})
        },
        runOptions: {
          ...(existing.runOptions || {}),
          ...(daemonTask.runOptions || {})
        },
        presentation: {
          ...(existing.presentation || {}),
          ...(daemonTask.presentation || {})
        }
      };
    } else {
      tasksConfig.tasks.push(daemonTask);
    }

    await writeJsonNoBom(paths.tasks, tasksConfig);

    const settings = await readJsonSafe(paths.settings, {});
    settings['task.allowAutomaticTasks'] = 'on';
    await writeJsonNoBom(paths.settings, settings);

    return {
      success: true,
      paths
    };
  } catch (error) {
    console.error('Error applying VS Code autostart config:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

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

  return {
    success: clients.success && workspace.success && vscode.success,
    projectPath,
    mcpUrl: clients.mcpUrl,
    unifiedConfigPath: clients.unifiedConfigPath,
    clientResults: clients.results,
    workspace,
    vscode
  };
}

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
