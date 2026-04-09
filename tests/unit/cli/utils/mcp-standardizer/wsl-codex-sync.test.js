import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { syncWindowsCodexMcpToWsl } from '../../../../../src/cli/utils/mcp-standardizer/wsl-codex-sync.js';

async function createTempDir(prefix) {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function readFile(filePath) {
  return await fs.readFile(filePath, 'utf8');
}

const tempDirs = [];

async function makePaths() {
  const root = await createTempDir('omnysys-wsl-sync-');
  tempDirs.push(root);

  const windowsHome = path.join(root, 'windows-home');
  const wslHome = path.join(root, 'wsl-home');
  const windowsConfigPath = path.join(windowsHome, '.codex', 'config.toml');
  const wslConfigPath = path.join(wslHome, '.codex', 'config.toml');

  return {
    root,
    windowsHome,
    wslHome,
    windowsConfigPath,
    wslConfigPath
  };
}

function buildWindowsConfig() {
  return `
[mcp_servers.browsermcp]
command = "npx"
args = ["@browsermcp/mcp@latest"]

[mcp_servers.omnysystem]
type = "stdio"
command = "C:/Program Files/nodejs/node.exe"
args = ["c:/Dev/OmnySystem/src/layer-c-memory/mcp-stdio-bridge.js"]
cwd = "C:/Dev/OmnySystem"
startup_timeout_sec = 120
env = { OMNYSYS_DAEMON_URL = "http://127.0.0.1:9999/mcp", OMNYSYS_HEALTH_URL = "http://127.0.0.1:9999/health", OMNYSYS_AUTO_START = "1", OMNYSYS_PROJECT_PATH = "C:/Dev/OmnySystem", OMNYSYS_CLIENT_ID = "codex", OMNYSYS_CLIENT_NAME = "codex" }
`.trimStart();
}

describe('syncWindowsCodexMcpToWsl', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('copies missing MCP tables and adapts omnysystem to the WSL wrapper launcher', async () => {
    const paths = await makePaths();

    await writeFile(paths.windowsConfigPath, buildWindowsConfig());
    await writeFile(paths.wslConfigPath, 'model = "gpt-5.4"\n');

    const result = await syncWindowsCodexMcpToWsl({
      platform: 'linux',
      env: {
        HOME: paths.wslHome,
        USERPROFILE: paths.windowsHome,
        WSL_DISTRO_NAME: 'Ubuntu'
      },
      windowsConfigPath: paths.windowsConfigPath,
      wslConfigPath: paths.wslConfigPath
    });

    const wslConfig = await readFile(paths.wslConfigPath);

    expect(result.applied).toBe(true);
    expect(result.adaptedTables).toEqual(['mcp_servers.omnysystem']);
    expect(result.syncedTables).toContain('mcp_servers.browsermcp');
    expect(wslConfig).toContain('[mcp_servers.omnysystem]');
    expect(wslConfig).toContain('command = "bash"');
    expect(wslConfig).toContain('args = ["/mnt/c/Dev/OmnySystem/scripts/mcp/omnysystem-wsl-bridge.sh"]');
    expect(wslConfig).toContain('OMNYSYS_AUTO_START = "0"');
    expect(wslConfig).toContain('OMNYSYS_PROJECT_PATH = "/mnt/c/Dev/OmnySystem"');
  });

  it('upgrades the older WSL node bridge config to the wrapper launcher', async () => {
    const paths = await makePaths();

    await writeFile(paths.windowsConfigPath, buildWindowsConfig());
    await writeFile(paths.wslConfigPath, `
[mcp_servers.omnysystem]
type = "stdio"
command = "node"
args = ["/mnt/c/Dev/OmnySystem/src/layer-c-memory/mcp-stdio-bridge.js"]
cwd = "/mnt/c/Dev/OmnySystem"
startup_timeout_sec = 120
env = { OMNYSYS_DAEMON_URL = "http://127.0.0.1:9999/mcp", OMNYSYS_HEALTH_URL = "http://127.0.0.1:9999/health", OMNYSYS_AUTO_START = "0", OMNYSYS_PROJECT_PATH = "/mnt/c/Dev/OmnySystem", OMNYSYS_CLIENT_ID = "codex", OMNYSYS_CLIENT_NAME = "codex" }
`.trimStart());

    const result = await syncWindowsCodexMcpToWsl({
      platform: 'linux',
      env: {
        HOME: paths.wslHome,
        USERPROFILE: paths.windowsHome,
        WSL_DISTRO_NAME: 'Ubuntu'
      },
      windowsConfigPath: paths.windowsConfigPath,
      wslConfigPath: paths.wslConfigPath
    });

    const wslConfig = await readFile(paths.wslConfigPath);

    expect(result.applied).toBe(true);
    expect(result.adaptedTables).toEqual(['mcp_servers.omnysystem']);
    expect(wslConfig).not.toContain('command = "node"');
    expect(wslConfig).toContain('command = "bash"');
    expect(wslConfig).toContain('/scripts/mcp/omnysystem-wsl-bridge.sh');
  });

  it('is idempotent once the wrapper-backed omnysystem config already exists', async () => {
    const paths = await makePaths();

    await writeFile(paths.windowsConfigPath, buildWindowsConfig());
    await writeFile(paths.wslConfigPath, `
[mcp_servers.omnysystem]
type = "stdio"
command = "bash"
args = ["/mnt/c/Dev/OmnySystem/scripts/mcp/omnysystem-wsl-bridge.sh"]
cwd = "/mnt/c/Dev/OmnySystem"
startup_timeout_sec = 120
env = { OMNYSYS_DAEMON_URL = "http://127.0.0.1:9999/mcp", OMNYSYS_HEALTH_URL = "http://127.0.0.1:9999/health", OMNYSYS_AUTO_START = "0", OMNYSYS_PROJECT_PATH = "/mnt/c/Dev/OmnySystem", OMNYSYS_CLIENT_ID = "codex", OMNYSYS_CLIENT_NAME = "codex" }
`.trimStart());

    const result = await syncWindowsCodexMcpToWsl({
      platform: 'linux',
      env: {
        HOME: paths.wslHome,
        USERPROFILE: paths.windowsHome,
        WSL_DISTRO_NAME: 'Ubuntu'
      },
      windowsConfigPath: paths.windowsConfigPath,
      wslConfigPath: paths.wslConfigPath
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('no_missing_wsl_mcp_tables');
    expect(result.adaptedTables).toEqual([]);
  });
});
