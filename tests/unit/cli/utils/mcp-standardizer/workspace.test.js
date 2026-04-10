import { describe, expect, it } from 'vitest';

import {
  buildDaemonTask,
  buildWorkspaceMcpPayload
} from '../../../../../src/cli/utils/mcp-standardizer/workspace.js';

describe('workspace MCP generation', () => {
  it('writes Windows-native workspace bridge config for mounted Windows projects', () => {
    const payload = buildWorkspaceMcpPayload('/mnt/c/Dev/OmnySystem');
    const server = payload.mcpServers.omnysystem;

    expect(server.command).toBe('C:/Program Files/nodejs/node.exe');
    expect(server.args).toEqual(['C:/Dev/OmnySystem/src/layer-c-memory/mcp-stdio-bridge.js']);
    expect(server.cwd).toBe('C:/Dev/OmnySystem');
    expect(server.env.OMNYSYS_PROJECT_PATH).toBe('C:/Dev/OmnySystem');
  });

  it('keeps Unix workspace bridge config for Unix projects', () => {
    const payload = buildWorkspaceMcpPayload('/home/maur/projects/omnysystem');
    const server = payload.mcpServers.omnysystem;

    expect(server.command).not.toMatch(/node\.exe$/i);
    expect(server.args).toEqual(['/mnt/c/Dev/OmnySystem/src/layer-c-memory/mcp-stdio-bridge.js']);
    expect(server.cwd).toBe('/home/maur/projects/omnysystem');
  });

  it('writes a Windows node command for the VS Code daemon task on mounted Windows workspaces', () => {
    const task = buildDaemonTask({ projectPath: '/mnt/c/Dev/OmnySystem' });

    expect(task.command).toBe('C:/Program Files/nodejs/node.exe');
    expect(task.args).toEqual(['src/layer-c-memory/mcp-http-proxy.js']);
  });
});
