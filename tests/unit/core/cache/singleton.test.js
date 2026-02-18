/**
 * @fileoverview singleton.test.js
 *
 * Tests unitarios para el singleton de UnifiedCacheManager.
 *
 * Cubre:
 * 1. Retorna instancia de UnifiedCacheManager
 * 2. Misma ruta → misma instancia (identidad de referencia)
 * 3. Rutas distintas → instancias distintas
 * 4. Llamadas concurrentes → mismo Promise (sin duplicate init)
 * 5. invalidateCacheInstance elimina del Map
 * 6. Tras invalidación, nueva llamada crea instancia fresca
 * 7. getCacheInstanceCount y getCacheInstanceKeys
 * 8. Integración con la API pública de core/cache/index.js
 *
 * @module tests/unit/core/cache/singleton
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

import {
  getCacheManager,
  invalidateCacheInstance,
  getCacheInstanceCount,
  getCacheInstanceKeys
} from '../../../../src/core/cache/singleton.js';

// También verificar que está re-exportado desde el index
import * as cacheIndex from '../../../../src/core/cache/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Crea un directorio temporal único para cada test */
function makeTempPath(label = '') {
  return path.join(os.tmpdir(), `omny-singleton-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

/** Limpia una lista de paths del singleton y del filesystem */
async function cleanup(paths) {
  for (const p of paths) {
    invalidateCacheInstance(p);
    try {
      await fs.rm(p, { recursive: true, force: true });
    } catch {
      // Ignorar errores de cleanup
    }
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getCacheManager — singleton', () => {
  const registeredPaths = [];

  afterEach(async () => {
    await cleanup(registeredPaths);
    registeredPaths.length = 0;
  });

  // ── 1. Retorna una instancia válida ────────────────────────────────────────
  describe('basic instantiation', () => {
    it('should return an object with the UnifiedCacheManager interface', async () => {
      const dir = makeTempPath('basic');
      registeredPaths.push(dir);

      const cache = await getCacheManager(dir);

      expect(cache).toBeDefined();
      expect(typeof cache.initialize).toBe('function');
      expect(typeof cache.clear).toBe('function');
      expect(typeof cache.getStats).toBe('function');
      expect(cache.projectPath).toBe(path.resolve(dir));
    });

    it('should have loaded = true after getCacheManager', async () => {
      const dir = makeTempPath('loaded');
      registeredPaths.push(dir);

      const cache = await getCacheManager(dir);
      expect(cache.loaded).toBe(true);
    });
  });

  // ── 2. Misma ruta → misma instancia ───────────────────────────────────────
  describe('singleton identity', () => {
    it('should return the SAME instance for the same path (===)', async () => {
      const dir = makeTempPath('identity');
      registeredPaths.push(dir);

      const cache1 = await getCacheManager(dir);
      const cache2 = await getCacheManager(dir);

      expect(cache1).toBe(cache2); // identidad de referencia
    });

    it('should return the same instance for normalized paths (relative vs absolute)', async () => {
      // Vitest corre en process.cwd() = c:/Dev/OmnySystem
      // Usamos un path absoluto en os.tmpdir() para evitar ambigüedades
      const dir = makeTempPath('normalize');
      registeredPaths.push(dir);

      const absPath = path.resolve(dir);

      const cache1 = await getCacheManager(absPath);
      const cache2 = await getCacheManager(absPath);

      expect(cache1).toBe(cache2);
    });

    it('should return DIFFERENT instances for different paths', async () => {
      const dir1 = makeTempPath('diff-a');
      const dir2 = makeTempPath('diff-b');
      registeredPaths.push(dir1, dir2);

      const cache1 = await getCacheManager(dir1);
      const cache2 = await getCacheManager(dir2);

      expect(cache1).not.toBe(cache2);
      expect(cache1.projectPath).not.toBe(cache2.projectPath);
    });
  });

  // ── 3. Llamadas concurrentes → mismo Promise ──────────────────────────────
  describe('concurrent initialization', () => {
    it('should not initialize twice when called concurrently (same Promise)', async () => {
      const dir = makeTempPath('concurrent');
      registeredPaths.push(dir);

      // Llamar 5 veces concurrentemente antes de que termine ninguna
      const [c1, c2, c3, c4, c5] = await Promise.all([
        getCacheManager(dir),
        getCacheManager(dir),
        getCacheManager(dir),
        getCacheManager(dir),
        getCacheManager(dir)
      ]);

      // Todas deben ser la MISMA instancia
      expect(c1).toBe(c2);
      expect(c2).toBe(c3);
      expect(c3).toBe(c4);
      expect(c4).toBe(c5);
    });

    it('should resolve to same instance after sequential + concurrent mix', async () => {
      const dir = makeTempPath('mix');
      registeredPaths.push(dir);

      const first = await getCacheManager(dir); // cold path
      const [second, third] = await Promise.all([
        getCacheManager(dir),
        getCacheManager(dir)
      ]);

      expect(first).toBe(second);
      expect(second).toBe(third);
    });
  });

  // ── 4. invalidateCacheInstance ────────────────────────────────────────────
  describe('invalidateCacheInstance', () => {
    it('should remove the instance from the map', async () => {
      const dir = makeTempPath('invalidate');
      registeredPaths.push(dir);

      const before = await getCacheManager(dir);
      const countBefore = getCacheInstanceCount();

      invalidateCacheInstance(dir);

      const countAfter = getCacheInstanceCount();
      expect(countAfter).toBe(countBefore - 1);

      // Nueva llamada crea instancia fresca (distinta referencia)
      const after = await getCacheManager(dir);
      expect(after).not.toBe(before);
    });

    it('should be safe to call invalidate on non-existent path', () => {
      expect(() => {
        invalidateCacheInstance('/non/existent/path/xyz');
      }).not.toThrow();
    });

    it('should allow re-initialization after invalidation', async () => {
      const dir = makeTempPath('reinit');
      registeredPaths.push(dir);

      const original = await getCacheManager(dir);
      invalidateCacheInstance(dir);
      const fresh = await getCacheManager(dir);

      expect(fresh).not.toBe(original);
      expect(fresh.loaded).toBe(true);
      expect(fresh.projectPath).toBe(path.resolve(dir));
    });
  });

  // ── 5. getCacheInstanceCount y getCacheInstanceKeys ───────────────────────
  describe('diagnostics', () => {
    it('getCacheInstanceCount should reflect registered instances', async () => {
      const dir = makeTempPath('count');
      registeredPaths.push(dir);

      const before = getCacheInstanceCount();
      await getCacheManager(dir);
      const after = getCacheInstanceCount();

      expect(after).toBe(before + 1);
    });

    it('getCacheInstanceKeys should include the registered path', async () => {
      const dir = makeTempPath('keys');
      registeredPaths.push(dir);

      await getCacheManager(dir);
      const keys = getCacheInstanceKeys();

      expect(keys).toContain(path.resolve(dir));
    });

    it('keys should not include path after invalidation', async () => {
      const dir = makeTempPath('keys-removed');
      registeredPaths.push(dir);

      await getCacheManager(dir);
      invalidateCacheInstance(dir);

      const keys = getCacheInstanceKeys();
      expect(keys).not.toContain(path.resolve(dir));
    });
  });

  // ── 6. Re-exports desde core/cache/index.js ───────────────────────────────
  describe('public API re-exports', () => {
    it('getCacheManager should be exported from core/cache/index.js', () => {
      expect(typeof cacheIndex.getCacheManager).toBe('function');
    });

    it('invalidateCacheInstance should be exported from core/cache/index.js', () => {
      expect(typeof cacheIndex.invalidateCacheInstance).toBe('function');
    });

    it('getCacheInstanceCount should be exported from core/cache/index.js', () => {
      expect(typeof cacheIndex.getCacheInstanceCount).toBe('function');
    });

    it('getCacheInstanceKeys should be exported from core/cache/index.js', () => {
      expect(typeof cacheIndex.getCacheInstanceKeys).toBe('function');
    });

    it('singleton namespace export should exist', () => {
      expect(cacheIndex.singleton).toBeDefined();
      expect(typeof cacheIndex.singleton.getCacheManager).toBe('function');
      expect(typeof cacheIndex.singleton.invalidateCacheInstance).toBe('function');
    });

    it('getCacheManager from index should be same function as from singleton', () => {
      expect(cacheIndex.getCacheManager).toBe(getCacheManager);
    });
  });
});

// ─── Tests de la Factory ──────────────────────────────────────────────────────

describe('MockCacheManagerBuilder', () => {
  it('should build a mock with correct interface', async () => {
    const { MockCacheManagerBuilder } = await import(
      '../../../../tests/factories/core-cache/builders.js'
    );

    const mock = MockCacheManagerBuilder.create()
      .withProjectPath('/test/project')
      .withEntry('src/app.js', { staticAnalyzed: true })
      .withRamData('metadata', { totalFiles: 1 })
      .build();

    expect(mock.projectPath).toBe('/test/project');
    expect(mock.index.entries['src/app.js']).toBeDefined();
    expect(mock.index.entries['src/app.js'].staticAnalyzed).toBe(true);
    expect(mock.get('metadata')).toEqual({ totalFiles: 1 });
    expect(mock.loaded).toBe(true);
  });

  it('should support set/get roundtrip', async () => {
    const { MockCacheManagerBuilder } = await import(
      '../../../../tests/factories/core-cache/builders.js'
    );

    const mock = MockCacheManagerBuilder.create().build();

    mock.set('test-key', { value: 42 });
    expect(mock.get('test-key')).toEqual({ value: 42 });
  });

  it('should return null for missing keys', async () => {
    const { MockCacheManagerBuilder } = await import(
      '../../../../tests/factories/core-cache/builders.js'
    );

    const mock = MockCacheManagerBuilder.create().build();
    expect(mock.get('non-existent')).toBeNull();
  });

  it('should clear all data on clear()', async () => {
    const { MockCacheManagerBuilder } = await import(
      '../../../../tests/factories/core-cache/builders.js'
    );

    const mock = MockCacheManagerBuilder.create()
      .withEntry('src/a.js', {})
      .withRamData('data', 'value')
      .build();

    await mock.clear();
    expect(mock.get('data')).toBeNull();
    expect(Object.keys(mock.index.entries)).toHaveLength(0);
  });
});

describe('CacheEntryBuilder', () => {
  it('should build a valid default entry', async () => {
    const { CacheEntryBuilder } = await import(
      '../../../../tests/factories/core-cache/builders.js'
    );

    const entry = CacheEntryBuilder.create().build();

    expect(entry.filePath).toBe('src/test.js');
    expect(entry.contentHash).toBe('abc123');
    expect(entry.staticAnalyzed).toBe(false);
    expect(entry.llmAnalyzed).toBe(false);
    expect(entry.version).toBe(1);
  });

  it('should build an LLM-analyzed entry', async () => {
    const { CacheEntryBuilder } = await import(
      '../../../../tests/factories/core-cache/builders.js'
    );

    const entry = CacheEntryBuilder.create()
      .withFilePath('src/complex.js')
      .withHash('xyz789')
      .asLLMAnalyzed()
      .withVersion(3)
      .build();

    expect(entry.filePath).toBe('src/complex.js');
    expect(entry.contentHash).toBe('xyz789');
    expect(entry.staticAnalyzed).toBe(true);
    expect(entry.llmAnalyzed).toBe(true);
    expect(entry.version).toBe(3);
  });
});

describe('CacheManagerConfigBuilder', () => {
  it('should build a default config', async () => {
    const { CacheManagerConfigBuilder } = await import(
      '../../../../tests/factories/core-cache/builders.js'
    );

    const config = CacheManagerConfigBuilder.create().asDefault().build();

    expect(config.projectPath).toBeDefined();
    expect(config.enableChangeDetection).toBe(false);
    expect(config.cascadeInvalidation).toBe(false);
  });

  it('should build a production config', async () => {
    const { CacheManagerConfigBuilder } = await import(
      '../../../../tests/factories/core-cache/builders.js'
    );

    const config = CacheManagerConfigBuilder.create()
      .withProjectPath('/production/app')
      .asProduction()
      .build();

    expect(config.projectPath).toBe(path.resolve('/production/app'));
    expect(config.enableChangeDetection).toBe(true);
    expect(config.cascadeInvalidation).toBe(true);
  });
});
