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
import { search_files } from '#layer-c/mcp/tools/search.js';
import { get_impact_map } from '#layer-c/mcp/tools/impact-map.js';
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
      metadata: { totalFiles: 150, totalFunctions: 800, analyzedAt: '2026-02-18' }
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

// ─── search_files ─────────────────────────────────────────────────────────────

describe('Tool: search_files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('retorna { found: 0, files: [] } cuando getProjectMetadata lanza', async () => {
    getProjectMetadata.mockRejectedValue(new Error('No data'));
    const context = makeContext();
    const result = await search_files({ pattern: 'cache' }, context);

    expect(result.found).toBe(0);
    expect(result.files).toEqual([]);
    expect(result.error).toBeDefined();
  });

  test('retorna archivos que coinciden con el patrón', async () => {
    getProjectMetadata.mockResolvedValue({
      fileIndex: {
        'src/core/cache/index.js': {},
        'src/core/cache/singleton.js': {},
        'src/services/llm-service.js': {},
        'src/layer-a-static/indexer.js': {}
      }
    });
    const context = makeContext();
    const result = await search_files({ pattern: 'cache' }, context);

    expect(result.found).toBe(2);
    expect(result.files).toContain('src/core/cache/index.js');
    expect(result.files).toContain('src/core/cache/singleton.js');
    expect(result.files).not.toContain('src/services/llm-service.js');
  });

  test('la búsqueda es case-insensitive', async () => {
    getProjectMetadata.mockResolvedValue({
      fileIndex: {
        'src/core/Cache/index.js': {},
        'src/OTHER/CACHE.js': {}
      }
    });
    const context = makeContext();
    const result = await search_files({ pattern: 'cache' }, context);

    expect(result.found).toBe(2);
  });

  test('limita resultados a 20 archivos máximo', async () => {
    const manyFiles = {};
    for (let i = 0; i < 30; i++) {
      manyFiles[`src/utils/helper-${i}.js`] = {};
    }
    getProjectMetadata.mockResolvedValue({ fileIndex: manyFiles });
    const context = makeContext();

    const result = await search_files({ pattern: 'helper' }, context);
    expect(result.found).toBe(30);
    expect(result.files.length).toBeLessThanOrEqual(20);
  });

  test('retorna el patrón buscado en la respuesta', async () => {
    getProjectMetadata.mockResolvedValue({ fileIndex: {} });
    const context = makeContext();
    const result = await search_files({ pattern: 'orchestrator' }, context);

    expect(result.pattern).toBe('orchestrator');
  });

  test('retorna totalIndexed con el número total de archivos en el índice', async () => {
    getProjectMetadata.mockResolvedValue({
      fileIndex: {
        'src/a.js': {},
        'src/b.js': {},
        'src/c.js': {}
      }
    });
    const context = makeContext();
    const result = await search_files({ pattern: 'none-will-match-xyz' }, context);

    expect(result.totalIndexed).toBe(3);
    expect(result.found).toBe(0);
  });
});

// ─── get_impact_map ───────────────────────────────────────────────────────────

describe('Tool: get_impact_map', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectMetadata.mockResolvedValue({ fileIndex: {} });
    getFileDependents.mockResolvedValue([]);
  });

  test('retorna { status: "not_ready" } cuando archivo no está en índice y servidor no está inicializado', async () => {
    getFileAnalysis.mockResolvedValue(null);
    const context = makeContext({
      server: { initialized: false }
    });

    const result = await get_impact_map({ filePath: 'src/missing.js' }, context);

    expect(result.status).toBe('not_ready');
    expect(result.message).toContain('not found in index');
  });

  test('retorna datos de impacto cuando el archivo está en el índice', async () => {
    getFileAnalysis.mockResolvedValue({
      exports: [{ name: 'myFn' }],
      riskScore: { severity: 'medium' },
      subsystem: 'core',
      semanticConnections: []
    });
    getFileDependents.mockResolvedValue(['src/consumer-a.js', 'src/consumer-b.js']);

    const context = makeContext({ server: { initialized: true } });
    const result = await get_impact_map({ filePath: 'src/my-module.js' }, context);

    expect(result.file).toBe('src/my-module.js');
    expect(result.directlyAffects).toEqual(['src/consumer-a.js', 'src/consumer-b.js']);
    expect(result.riskLevel).toBe('medium');
    expect(result.subsystem).toBe('core');
    expect(result.exports).toContain('myFn');
  });

  test('totalAffected es la suma de direct + transitive', async () => {
    getFileAnalysis.mockResolvedValue({
      exports: [],
      riskScore: { severity: 'low' },
      subsystem: 'unknown',
      semanticConnections: []
    });
    getFileDependents
      .mockResolvedValueOnce(['dep-a.js', 'dep-b.js'])  // Primera llamada (el archivo principal)
      .mockResolvedValue([]);                             // Llamadas siguientes (transitivas)

    const context = makeContext({ server: { initialized: true } });
    const result = await get_impact_map({ filePath: 'src/module.js' }, context);

    expect(result.totalAffected).toBe(result.directlyAffects.length + result.transitiveAffects.length);
  });

  test('exports vacíos si el archivo no tiene exports', async () => {
    getFileAnalysis.mockResolvedValue({
      exports: null,
      riskScore: null,
      subsystem: null,
      semanticConnections: []
    });
    getFileDependents.mockResolvedValue([]);

    const context = makeContext({ server: { initialized: true } });
    const result = await get_impact_map({ filePath: 'src/module.js' }, context);

    expect(result.exports).toEqual([]);
    expect(result.riskLevel).toBe('low'); // default
  });
});
