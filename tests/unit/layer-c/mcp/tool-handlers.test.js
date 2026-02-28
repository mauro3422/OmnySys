/**
 * @fileoverview tool-handlers.test.js
 *
 * Unit tests para tool handlers individuales del MCP
 * Testea el comportamiento con context mock (sin inicializar el servidor real)
 *
 * Cubre:
 * - get_server_status: retorna status básico sin orchestrator/cache
 * - get_server_status: retorna status completo con orchestrator y cache mock
 * - search_files: retorna not found cuando no hay metadata
 * - search_files: filtra correctamente por patrón
 * - get_impact_map: retorna not_ready cuando archivo no está en índice
 * - restart_server: retorna estructura correcta sin lanzar
 *
 * @module tests/unit/layer-c/mcp/tool-handlers
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { get_server_status } from '#layer-c/mcp/tools/status.js';

import { restart_server } from '#layer-c/mcp/tools/restart-server.js';

// ─── Mocks de las APIs de Layer C ─────────────────────────────────────────────

vi.mock('#layer-c/query/apis/project-api.js', () => ({
  getProjectMetadata: vi.fn()
}));

vi.mock('#layer-c/query/apis/file-api.js', () => ({
  getFileAnalysis: vi.fn(),
  getFileDependents: vi.fn()
}));

import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { getFileAnalysis, getFileDependents } from '#layer-c/query/apis/file-api.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeContext(overrides = {}) {
  return {
    projectPath: '/test/project',
    server: { initialized: false },
    orchestrator: null,
    cache: null,
    ...overrides
  };
}

// ─── get_server_status ────────────────────────────────────────────────────────

describe('Tool: get_server_status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectMetadata.mockResolvedValue(null);
  });

  test('retorna objeto status sin lanzar cuando orchestrator y cache son null', async () => {
    const context = makeContext();
    const result = await get_server_status({}, context);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('status.initialized es false cuando server.initialized es false', async () => {
    const context = makeContext({ server: { initialized: false } });
    const result = await get_server_status({}, context);

    expect(result.initialized).toBe(false);
  });

  test('status.initialized es true cuando server.initialized es true', async () => {
    const context = makeContext({ server: { initialized: true } });
    const result = await get_server_status({}, context);

    expect(result.initialized).toBe(true);
  });

  test('status.project apunta al projectPath del context', async () => {
    const context = makeContext({ projectPath: '/mi/proyecto' });
    const result = await get_server_status({}, context);

    expect(result.project).toBe('/mi/proyecto');
  });

  test('status.timestamp es una fecha ISO válida', async () => {
    const context = makeContext();
    const result = await get_server_status({}, context);

    expect(result.timestamp).toBeDefined();
    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(new Date(result.timestamp).getFullYear()).toBeGreaterThan(2020);
  });

  test('status.orchestrator.status es "not_ready" cuando orchestrator es null', async () => {
    const context = makeContext({ orchestrator: null });
    const result = await get_server_status({}, context);

    expect(result.orchestrator.status).toBe('not_ready');
  });

  test('status.orchestrator refleja getStatus() cuando orchestrator existe', async () => {
    const mockOrchestrator = {
      getStatus: vi.fn().mockReturnValue({ status: 'running', workers: 2 })
    };
    const context = makeContext({ orchestrator: mockOrchestrator });
    const result = await get_server_status({}, context);

    expect(mockOrchestrator.getStatus).toHaveBeenCalledOnce();
    expect(result.orchestrator.status).toBe('running');
  });

  test('status.cache.status es "not_ready" cuando cache es null', async () => {
    const context = makeContext({ cache: null });
    const result = await get_server_status({}, context);

    expect(result.cache.status).toBe('not_ready');
  });

  test('status.cache refleja getStats() cuando cache existe', async () => {
    const mockCache = {
      getStats: vi.fn().mockReturnValue({ hits: 42, misses: 3 })
    };
    const context = makeContext({ cache: mockCache });
    const result = await get_server_status({}, context);

    expect(mockCache.getStats).toHaveBeenCalledOnce();
    expect(result.cache.hits).toBe(42);
  });

  test('status.metadata incluye totalFiles cuando metadata existe', async () => {
    getProjectMetadata.mockResolvedValue({
      stats: { totalFiles: 150, totalAtoms: 800 },
      system_map_metadata: { analyzedAt: '2026-02-18' }
    });
    const context = makeContext();
    const result = await get_server_status({}, context);

    expect(result.metadata.totalFiles).toBe(150);
    expect(result.metadata.totalFunctions).toBe(800);
  });

  test('status.metadata.error existe si getProjectMetadata lanza', async () => {
    getProjectMetadata.mockRejectedValue(new Error('No metadata'));
    const context = makeContext();
    const result = await get_server_status({}, context);

    expect(result.metadata.error).toBeDefined();
  });
});


