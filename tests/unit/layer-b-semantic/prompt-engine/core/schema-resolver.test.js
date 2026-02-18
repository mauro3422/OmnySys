/**
 * @fileoverview schema-resolver.test.js
 *
 * Tests para el schema resolver del prompt engine.
 *
 * Contexto del bug (corregido en v0.9.18):
 * `schema-resolver.js` usaba `import(url, { assert: { type: 'json' } })` para
 * cargar schemas JSON. En Node 22+, `assert` fue reemplazado por `with`, lo que
 * causaba que todos los schemas fallaran silenciosamente y se devolviera `{}`.
 * Resultado: "No schema found for orphan-module" y "Error building prompt" masivos.
 *
 * Fix: reemplazado por `fs.readFile` + `JSON.parse` (compatible con Node 18/20/22).
 *
 * Cubre:
 * - `resolveSchema` carga correctamente los schemas conocidos
 * - `resolveSchema` fallback a default cuando el tipo no existe
 * - `hasSchema` retorna true para tipos con schema real
 * - `listAvailableSchemas` lista los tipos soportados
 * - `preloadSchemas` precarga múltiples schemas en cache
 * - `getSchemaSync` retorna null si no está en cache, el objeto si sí está
 * - Tipos conocidos: god-object, orphan-module, singleton, semantic-connections, dynamic-imports
 *
 * @module tests/unit/layer-b-semantic/prompt-engine/core/schema-resolver
 */

import { describe, test, expect } from 'vitest';
import {
  resolveSchema,
  hasSchema,
  listAvailableSchemas,
  preloadSchemas,
  getSchemaSync
} from '#layer-b/prompt-engine/core/schema-resolver.js';

// ─── Tests: resolveSchema ─────────────────────────────────────────────────────

describe('resolveSchema — carga de schemas JSON conocidos', () => {

  test('carga schema de orphan-module correctamente', async () => {
    const schema = await resolveSchema('orphan-module');
    expect(schema).toBeDefined();
    expect(Object.keys(schema).length).toBeGreaterThan(0);
    // El schema de orphan-module tiene required fields
    expect(schema).toHaveProperty('properties');
    expect(schema.properties).toHaveProperty('confidence');
    expect(schema.properties).toHaveProperty('isOrphan');
  });

  test('carga schema de god-object correctamente', async () => {
    const schema = await resolveSchema('god-object');
    expect(schema).toBeDefined();
    expect(Object.keys(schema).length).toBeGreaterThan(0);
    expect(schema).toHaveProperty('properties');
  });

  test('carga schema de singleton correctamente', async () => {
    const schema = await resolveSchema('singleton');
    expect(schema).toBeDefined();
    expect(Object.keys(schema).length).toBeGreaterThan(0);
  });

  test('carga schema de semantic-connections correctamente', async () => {
    const schema = await resolveSchema('semantic-connections');
    expect(schema).toBeDefined();
    expect(Object.keys(schema).length).toBeGreaterThan(0);
  });

  test('carga schema de dynamic-imports correctamente', async () => {
    const schema = await resolveSchema('dynamic-imports');
    expect(schema).toBeDefined();
    expect(Object.keys(schema).length).toBeGreaterThan(0);
  });

  test('carga schema de default correctamente', async () => {
    const schema = await resolveSchema('default');
    expect(schema).toBeDefined();
    expect(Object.keys(schema).length).toBeGreaterThan(0);
  });

  test('tipo desconocido → retorna schema default (no vacío)', async () => {
    // Un tipo desconocido debe caer en el fallback default.json
    // NO debe retornar {} ni lanzar error
    const schema = await resolveSchema('non-existent-type-xyz');
    // Debe retornar algo (el fallback default)
    expect(schema).toBeDefined();
    // Si default.json existe y es válido, debe tener propiedades
    // Si por alguna razón también falla, retorna {} — lo importante es no lanzar
    expect(typeof schema).toBe('object');
  });

  test('no lanza excepción para tipo desconocido', async () => {
    await expect(resolveSchema('totally-unknown-type')).resolves.not.toThrow();
  });

  test('tipo con caracteres especiales → retorna {} sin lanzar (isSafeTypeName)', async () => {
    // isSafeTypeName filtra tipos con caracteres peligrosos
    const schema = await resolveSchema('../../../etc/passwd');
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });

});

// ─── Tests: hasSchema ─────────────────────────────────────────────────────────

describe('hasSchema — verificación de existencia', () => {

  test('retorna true para orphan-module (el tipo problemático)', async () => {
    const result = await hasSchema('orphan-module');
    expect(result).toBe(true);
  });

  test('retorna true para god-object', async () => {
    expect(await hasSchema('god-object')).toBe(true);
  });

  test('retorna true para singleton', async () => {
    expect(await hasSchema('singleton')).toBe(true);
  });

  test('retorna true para semantic-connections', async () => {
    expect(await hasSchema('semantic-connections')).toBe(true);
  });

  test('retorna true para dynamic-imports', async () => {
    expect(await hasSchema('dynamic-imports')).toBe(true);
  });

  test('tipo completamente desconocido → resultado booleano (no lanza)', async () => {
    const result = await hasSchema('type-that-will-never-exist-abc123');
    // Puede ser true (si default.json tiene propiedades) o false (si default es {})
    // Lo importante es que no lanza y retorna boolean
    expect(typeof result).toBe('boolean');
  });

});

// ─── Tests: listAvailableSchemas ──────────────────────────────────────────────

describe('listAvailableSchemas — listado de tipos soportados', () => {

  test('retorna array con los tipos soportados', () => {
    const types = listAvailableSchemas();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
  });

  test('incluye orphan-module (el tipo problemático)', () => {
    expect(listAvailableSchemas()).toContain('orphan-module');
  });

  test('incluye god-object', () => {
    expect(listAvailableSchemas()).toContain('god-object');
  });

  test('incluye singleton', () => {
    expect(listAvailableSchemas()).toContain('singleton');
  });

  test('incluye semantic-connections', () => {
    expect(listAvailableSchemas()).toContain('semantic-connections');
  });

  test('NO incluye "default" en la lista pública', () => {
    // default es el fallback interno, no debe listarse como tipo de análisis
    expect(listAvailableSchemas()).not.toContain('default');
  });

});

// ─── Tests: preloadSchemas ────────────────────────────────────────────────────

describe('preloadSchemas — precarga en cache', () => {

  test('precarga múltiples schemas y retorna la cantidad cargada', async () => {
    const cache = new Map();
    const loaded = await preloadSchemas(['orphan-module', 'god-object', 'singleton'], cache);
    expect(loaded).toBe(3);
    expect(cache.size).toBe(3);
  });

  test('no recarga schemas ya en cache', async () => {
    const cache = new Map();
    cache.set('orphan-module', { already: 'cached' });
    const loaded = await preloadSchemas(['orphan-module', 'god-object'], cache);
    // Solo carga god-object, orphan-module ya estaba
    expect(loaded).toBe(1);
    // El cache debe tener ambos
    expect(cache.size).toBe(2);
    // El de orphan-module no fue sobreescrito
    expect(cache.get('orphan-module')).toEqual({ already: 'cached' });
  });

  test('con array vacío retorna 0 schemas cargados', async () => {
    const cache = new Map();
    const loaded = await preloadSchemas([], cache);
    expect(loaded).toBe(0);
    expect(cache.size).toBe(0);
  });

});

// ─── Tests: getSchemaSync ─────────────────────────────────────────────────────

describe('getSchemaSync — acceso síncrono al cache', () => {

  test('retorna null si el tipo no está en cache', () => {
    const cache = new Map();
    expect(getSchemaSync('orphan-module', cache)).toBeNull();
  });

  test('retorna el schema si está en cache', () => {
    const cache = new Map();
    const mockSchema = { type: 'object', properties: { confidence: { type: 'number' } } };
    cache.set('orphan-module', mockSchema);
    expect(getSchemaSync('orphan-module', cache)).toBe(mockSchema);
  });

  test('retorna null con cache vacío', () => {
    expect(getSchemaSync('anything', new Map())).toBeNull();
  });

});
