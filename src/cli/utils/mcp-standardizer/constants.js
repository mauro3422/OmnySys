import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// We are in src/cli/utils/mcp-standardizer/constants.js, so repo root is 4 levels up
export const repoRoot = path.resolve(__dirname, '../../../..');

export const SERVER_KEY = 'omnysystem';
export const LEGACY_SERVER_KEYS = ['omnysys', 'omny-system'];
export const UNIFIED_CONFIG_FILE = 'mcp-unified.config.json';
export const APPDATA_DIR = process.env.APPDATA || '';
export const MCP_SCHEMA_URL = 'https://modelcontextprotocol.io/schemas/2024-11-05/mcp-servers-config.schema.json';

export const WORKSPACE_FILES = {
    dotMcp: '.mcp.json',
    mcpServers: 'mcp-servers.json',
    mcpServersSchema: 'mcp-servers.schema.json'
};

export const VSCODE_FILES = {
    tasks: path.join('.vscode', 'tasks.json'),
    settings: path.join('.vscode', 'settings.json')
};

export const VSCODE_DAEMON_TASK_LABEL = 'OmnySys MCP Daemon';
export const VSCODE_DAEMON_TASK_COMMAND = 'node src/layer-c-memory/mcp-http-server.js';

export const CONFIG_PATHS = {
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
