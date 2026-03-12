import { describe, expect, it } from 'vitest';
import { performance } from 'perf_hooks';
import { OmnySysMCPServer } from '../../src/layer-c-memory/mcp/core/server-class.js';
import { McpSetupStep } from '../../src/layer-c-memory/mcp/core/initialization/steps/mcp-setup-step.js';

describe('Performance: MCP startup', () => {
  it('configures the MCP server within a minimal startup budget', () => {
    const server = new OmnySysMCPServer(process.cwd());
    const step = new McpSetupStep();

    const startedAt = performance.now();
    const result = step.execute(server);
    const elapsedMs = performance.now() - startedAt;

    expect(result).toBe(true);
    expect(server.server).toBeDefined();
    expect(elapsedMs).toBeLessThan(500);
  });
});
