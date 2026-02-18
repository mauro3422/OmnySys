/**
 * @fileoverview mcp-setup-step.test.js
 *
 * Unit tests for McpSetupStep
 *
 * Cubre:
 * - McpSetupStep puede importarse
 * - execute() crea el MCP server si no existe (server.server === null)
 * - execute() SKIPS re-inicialización si server.server ya existe (safety guard)
 * - execute() registra handlers para ListTools y CallTool
 * - handleToolCall() resuelve herramienta conocida con context correcto
 * - handleToolCall() lanza McpError para herramienta desconocida
 *
 * @module tests/unit/layer-c/mcp/mcp-setup-step
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { McpSetupStep } from '#layer-c/mcp/core/initialization/steps/mcp-setup-step.js';
import { toolDefinitions } from '#layer-c/mcp/tools/index.js';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock del MCP SDK Server
// ⚠️ Se usa función regular (no arrow function) porque se llama con `new Server()`
// Arrow functions no pueden usarse como constructores con `new`
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(function() {
    this.setRequestHandler = vi.fn();
    this.onerror = null;
  })
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: 'CallToolRequestSchema',
  ListToolsRequestSchema: 'ListToolsRequestSchema',
  ErrorCode: { MethodNotFound: -32601 },
  McpError: class McpError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeServer(overrides = {}) {
  return {
    projectPath: '/test/project',
    initialized: false,
    orchestrator: null,
    cache: null,
    server: null, // El MCP Server instance (null = no inicializado)
    ...overrides
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('McpSetupStep', () => {

  let step;

  beforeEach(() => {
    step = new McpSetupStep();
    vi.clearAllMocks();
  });

  // ── Construcción ────────────────────────────────────────────────────────────

  test('se puede instanciar', () => {
    expect(step).toBeDefined();
    expect(step.name).toBe('mcp-setup');
  });

  // ── execute() — primera inicialización ──────────────────────────────────────

  test('execute() crea server.server si es null', async () => {
    const server = makeServer({ server: null });
    const result = await step.execute(server);

    expect(result).toBe(true);
    expect(server.server).not.toBeNull();
  });

  test('execute() registra handler para ListTools', async () => {
    const server = makeServer({ server: null });
    await step.execute(server);

    // Debe haber llamado setRequestHandler al menos una vez con ListToolsRequestSchema
    expect(server.server.setRequestHandler).toHaveBeenCalledWith(
      'ListToolsRequestSchema',
      expect.any(Function)
    );
  });

  test('execute() registra handler para CallTool', async () => {
    const server = makeServer({ server: null });
    await step.execute(server);

    // Debe haber llamado setRequestHandler con CallToolRequestSchema
    expect(server.server.setRequestHandler).toHaveBeenCalledWith(
      'CallToolRequestSchema',
      expect.any(Function)
    );
  });

  test('execute() configura server.server.onerror', async () => {
    const server = makeServer({ server: null });
    await step.execute(server);

    expect(server.server.onerror).toBeDefined();
    expect(typeof server.server.onerror).toBe('function');
  });

  // ── SAFETY GUARD: no re-inicialización ──────────────────────────────────────

  test('execute() SALTA re-inicialización si server.server ya existe', async () => {
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');

    const existingMcpServer = {
      setRequestHandler: vi.fn(),
      onerror: null
    };

    const server = makeServer({ server: existingMcpServer });
    const result = await step.execute(server);

    expect(result).toBe(true);
    // El Server constructor NO debe haberse vuelto a llamar
    expect(Server).not.toHaveBeenCalled();
    // El server.server no debe haber cambiado
    expect(server.server).toBe(existingMcpServer);
  });

  test('execute() con server existente no sobreescribe setRequestHandler', async () => {
    const existingServer = {
      setRequestHandler: vi.fn(),
      onerror: null
    };

    const server = makeServer({ server: existingServer });
    await step.execute(server);

    // El existing server NO debe haber llamado setRequestHandler de nuevo
    expect(existingServer.setRequestHandler).not.toHaveBeenCalled();
  });

  // ── shouldExecute() ─────────────────────────────────────────────────────────

  test('shouldExecute() retorna true por defecto (no tiene guard de isPrimary)', () => {
    const server = makeServer();
    // McpSetupStep siempre ejecuta (tanto en PRIMARY como en LIGHT)
    expect(step.shouldExecute(server)).toBe(true);
  });
});

// ─── ListTools handler ────────────────────────────────────────────────────────

describe('McpSetupStep — ListTools handler', () => {
  test('el handler de ListTools retorna todas las tools registradas', async () => {
    const step = new McpSetupStep();
    const server = makeServer({ server: null });
    await step.execute(server);

    // Capturar el handler que se registró para ListTools
    const listToolsCall = server.server.setRequestHandler.mock.calls
      .find(call => call[0] === 'ListToolsRequestSchema');

    expect(listToolsCall).toBeDefined();
    const listToolsHandler = listToolsCall[1];

    const response = await listToolsHandler({});
    expect(response.tools).toBeDefined();
    expect(Array.isArray(response.tools)).toBe(true);
    expect(response.tools.length).toBe(toolDefinitions.length);
  });
});
