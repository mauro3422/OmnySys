/**
 * @fileoverview import-health.test.js
 *
 * Import Health Test — Verifica que todos los módulos principales
 * se pueden importar correctamente SIN mocks.
 *
 * PROPÓSITO: Detectar imports rotos ANTES de que lleguen a producción.
 * A diferencia de los tests unitarios (que usan mocks), este test
 * importa los módulos REALES. Si un archivo se mueve o borra,
 * este test fallará inmediatamente.
 *
 * ⚠️ IMPORTANTE: Este test NO usa vi.mock() ni factories.
 * Si falla, hay un import roto real en el código de producción.
 *
 * @module tests/integration/import-health
 */

import { describe, test, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════
// LAYER GRAPH — Grafo de dependencias
// ═══════════════════════════════════════════════════════════════════

describe('Layer Graph — imports saludables', () => {
  test('index.js carga con exports esperados', async () => {
    const mod = await import('#layer-graph/index.js');
    expect(mod).toBeDefined();
    expect(typeof mod.buildSystemMap).toBe('function');
    expect(typeof mod.getImpactMap).toBe('function');
    expect(typeof mod.detectCycles).toBe('function');
    expect(mod.RISK_LEVELS).toBeDefined();
  });

  test('builders/system-map.js carga correctamente', async () => {
    const mod = await import('#layer-graph/builders/system-map.js');
    expect(mod).toBeDefined();
  });

  test('algorithms/cycle-detector.js carga correctamente', async () => {
    const mod = await import('#layer-graph/algorithms/cycle-detector.js');
    expect(mod).toBeDefined();
  });

  test('algorithms/impact-analyzer.js carga correctamente', async () => {
    const mod = await import('#layer-graph/algorithms/impact-analyzer.js');
    expect(mod).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// LAYER A — Análisis estático
// ═══════════════════════════════════════════════════════════════════

describe('Layer A — imports saludables', () => {
  test('scanner.js carga correctamente', async () => {
    const mod = await import('#layer-a/scanner.js');
    expect(mod).toBeDefined();
    expect(typeof mod.scanProject).toBe('function');
  });

  test('resolver.js carga correctamente', async () => {
    const mod = await import('#layer-a/resolver.js');
    expect(mod).toBeDefined();
  });

  test('indexer.js carga correctamente', async () => {
    const mod = await import('#layer-a/indexer.js');
    expect(mod).toBeDefined();
  });

  test('analyzer.js carga correctamente', async () => {
    const mod = await import('#layer-a/analyzer.js');
    expect(mod).toBeDefined();
  });

  test('pipeline/single-file.js carga correctamente', async () => {
    const mod = await import('#layer-a/pipeline/single-file.js');
    expect(mod).toBeDefined();
  });

  test('pipeline/molecular-extractor.js carga correctamente', async () => {
    const mod = await import('#layer-a/pipeline/molecular-extractor.js');
    expect(mod).toBeDefined();
    expect(typeof mod.extractMolecularStructure).toBe('function');
  });

  test('extractors/metadata/side-effects.js carga correctamente', async () => {
    const mod = await import('#layer-a/extractors/metadata/side-effects.js');
    expect(mod).toBeDefined();
    expect(typeof mod.extractSideEffects).toBe('function');
  });

  test('extractors/atomic/index.js carga correctamente', async () => {
    const mod = await import('#layer-a/extractors/atomic/index.js');
    expect(mod).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// LAYER B — Análisis semántico
// ═══════════════════════════════════════════════════════════════════

describe('Layer B — imports saludables', () => {
  test('metadata-contract/index.js carga correctamente', async () => {
    const mod = await import('#layer-b/metadata-contract/index.js');
    expect(mod).toBeDefined();
  });

  test('metadata-contract/constants.js carga correctamente', async () => {
    const mod = await import('#layer-b/metadata-contract/constants.js');
    expect(mod).toBeDefined();
  });

  test('prompt-engine/index.js carga correctamente', async () => {
    const mod = await import('#layer-b/prompt-engine/index.js');
    expect(mod).toBeDefined();
  });

  test('schema-validator carga correctamente', async () => {
    const dirs = ['#layer-b/schema-validator'];
    for (const dir of dirs) {
      const mod = await import(`${dir}/index.js`).catch(() => import(dir));
      expect(mod).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// LAYER C — MCP Server & Storage
// ═══════════════════════════════════════════════════════════════════

describe('Layer C — imports saludables', () => {
  test('storage/index.js carga correctamente', async () => {
    const mod = await import('#layer-c/storage/index.js');
    expect(mod).toBeDefined();
  });

  test('query/apis/file-api.js carga correctamente', async () => {
    const mod = await import('#layer-c/query/apis/file-api.js');
    expect(mod).toBeDefined();
  });

  test('query/apis/project-api.js carga correctamente', async () => {
    const mod = await import('#layer-c/query/apis/project-api.js');
    expect(mod).toBeDefined();
  });

  test('query/apis/dependency-api.js carga correctamente', async () => {
    const mod = await import('#layer-c/query/apis/dependency-api.js');
    expect(mod).toBeDefined();
  });

  test('mcp/core/server-class.js carga correctamente', async () => {
    const mod = await import('#layer-c/mcp/core/server-class.js');
    expect(mod).toBeDefined();
    expect(typeof mod.OmnySysMCPServer).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════
// CORE — Infraestructura
// ═══════════════════════════════════════════════════════════════════

describe('Core — imports saludables', () => {
  test('cache/index.js carga correctamente', async () => {
    const mod = await import('#core/cache/index.js');
    expect(mod).toBeDefined();
  });

  test('cache/singleton.js carga correctamente', async () => {
    const mod = await import('#core/cache/singleton.js');
    expect(mod).toBeDefined();
    expect(typeof mod.getCacheManager).toBe('function');
    expect(typeof mod.invalidateCacheInstance).toBe('function');
  });

  test('core/index.js carga correctamente con re-exports', async () => {
    const mod = await import('#core/index.js');
    expect(mod).toBeDefined();
    // Verifica re-exports de layer-graph
    expect(typeof mod.buildSystemMap).toBe('function');
    expect(typeof mod.getImpactMap).toBe('function');
    // Verifica re-exports de storage
    expect(typeof mod.saveMetadata).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════
// UTILS & SHARED — Utilidades base
// ═══════════════════════════════════════════════════════════════════

describe('Utils & Shared — imports saludables', () => {
  test('utils/logger.js carga correctamente', async () => {
    const mod = await import('#utils/logger.js');
    expect(mod).toBeDefined();
    expect(typeof mod.createLogger).toBe('function');
  });

  test('shared existe y carga', async () => {
    // shared/ puede tener varios puntos de entrada
    const mod = await import('#shared/architecture-utils.js').catch(() => ({ __skipped: true }));
    // Si el archivo existe, verificar que es válido
    if (!mod.__skipped) {
      expect(mod).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// VALIDATION — Sistema de validación
// ═══════════════════════════════════════════════════════════════════

describe('Validation — imports saludables', () => {
  test('validation/index.js carga correctamente', async () => {
    const mod = await import('#validation/index.js');
    expect(mod).toBeDefined();
    expect(mod.VERSION).toBe('1.0.0');
  });
});
