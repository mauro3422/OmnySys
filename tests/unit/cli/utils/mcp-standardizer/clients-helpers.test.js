import { describe, expect, it } from 'vitest';

import {
  buildBridgeEnv,
  buildBridgePath,
  buildCodexTableBody,
  getCodexProjectTrustTableNames
} from '../../../../../src/cli/utils/mcp-standardizer/clients-helpers.js';
import { getNodeCommand } from '../../../../../src/cli/utils/mcp-standardizer/node-command.js';

describe('getCodexProjectTrustTableNames', () => {
  it('includes both single-quoted and double-quoted TOML tables for WSL-style paths', () => {
    const tableNames = getCodexProjectTrustTableNames('/mnt/c/Dev/OmnySystem');

    expect(tableNames).toContain("projects.'/mnt/c/Dev/OmnySystem'");
    expect(tableNames).toContain('projects."/mnt/c/Dev/OmnySystem"');
  });

  it('returns unique table names even when the canonical path only needs one form of escaping', () => {
    const tableNames = getCodexProjectTrustTableNames('/mnt/c/Dev/OmnySystem');

    expect(new Set(tableNames).size).toBe(tableNames.length);
  });
});

describe('target-aware bridge generation', () => {
  it('serializes Windows-native bridge paths for mounted Windows workspaces', () => {
    expect(buildBridgePath({ projectPath: '/mnt/c/Dev/OmnySystem' })).toBe(
      'C:/Dev/OmnySystem/src/layer-c-memory/mcp-stdio-bridge.js'
    );

    expect(buildBridgeEnv('http://127.0.0.1:9999/mcp', '/mnt/c/Dev/OmnySystem').OMNYSYS_PROJECT_PATH).toBe(
      'C:/Dev/OmnySystem'
    );
  });

  it('keeps Unix bridge paths for Unix consumers', () => {
    expect(buildBridgePath({
      filePath: '/home/maur/.codex/config.toml',
      projectPath: '/mnt/c/Dev/OmnySystem'
    })).toBe('/mnt/c/Dev/OmnySystem/src/layer-c-memory/mcp-stdio-bridge.js');

    expect(buildBridgeEnv(
      'http://127.0.0.1:9999/mcp',
      '/mnt/c/Dev/OmnySystem',
      { filePath: '/home/maur/.codex/config.toml' }
    ).OMNYSYS_PROJECT_PATH).toBe('/mnt/c/Dev/OmnySystem');
  });

  it('selects Windows node.exe for Windows-facing configs even when tests run in WSL', () => {
    expect(getNodeCommand({ projectPath: '/mnt/c/Dev/OmnySystem' })).toBe('C:/Program Files/nodejs/node.exe');
  });

  it('builds a Unix Codex table for the WSL Codex config', () => {
    const tableBody = buildCodexTableBody(
      'http://127.0.0.1:9999/mcp',
      '/mnt/c/Dev/OmnySystem',
      {
        filePath: '/home/maur/.codex/config.toml',
        unixNodePath: '/custom/node'
      }
    );

    expect(tableBody).toContain('command = "/custom/node"');
    expect(tableBody).toContain('args = ["/mnt/c/Dev/OmnySystem/src/layer-c-memory/mcp-stdio-bridge.js"]');
    expect(tableBody).toContain('cwd = "/mnt/c/Dev/OmnySystem"');
  });
});
