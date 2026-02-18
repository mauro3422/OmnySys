/**
 * @fileoverview smoke.test.js
 *
 * Smoke Test de Layer C — Verifica que el MCP Server puede cargar
 * e instanciarse sin errores.
 *
 * PROPÓSITO: Este es el test de integración más básico del sistema.
 * Verifica que:
 * 1. La clase OmnySysMCPServer se puede importar
 * 2. Se puede instanciar correctamente
 * 3. Tiene todos los métodos de ciclo de vida requeridos
 * 4. Las propiedades de estado inicial son correctas
 *
 * ⚠️ NOTA: Este test NO inicia el servidor completo (no llama a initialize()
 * ni a run()) porque eso requeriría un proyecto real con análisis completo.
 * Para un test E2E completo, ver tests/e2e/.
 *
 * @module tests/integration/smoke
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';

// Importación real del módulo (sin mocks)
import { OmnySysMCPServer } from '#layer-c/mcp/core/server-class.js';

describe('MCP Server — Smoke Test', () => {
  let server;
  const testProjectPath = path.join(process.cwd(), 'test-cases', 'scenario-1-simple-import');

  // ─── Carga del módulo ──────────────────────────────────────────

  test('OmnySysMCPServer clase carga sin errores', () => {
    expect(OmnySysMCPServer).toBeDefined();
    expect(typeof OmnySysMCPServer).toBe('function');
  });

  // ─── Instanciación ────────────────────────────────────────────

  test('El servidor se puede instanciar con un path de proyecto', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(OmnySysMCPServer);
  });

  test('El servidor acepta path absoluto', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(instance.projectPath).toBe(process.cwd());
  });

  // ─── Métodos de ciclo de vida ─────────────────────────────────

  test('El servidor tiene método initialize()', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(typeof instance.initialize).toBe('function');
  });

  test('El servidor tiene método run()', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(typeof instance.run).toBe('function');
  });

  test('El servidor tiene método shutdown()', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(typeof instance.shutdown).toBe('function');
  });

  test('El servidor tiene método printBanner()', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(typeof instance.printBanner).toBe('function');
  });

  // ─── Estado inicial ────────────────────────────────────────────

  test('Estado inicial: initialized es false', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(instance.initialized).toBe(false);
  });

  test('Estado inicial: orchestrator es null', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(instance.orchestrator).toBeNull();
  });

  test('Estado inicial: cache es null', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(instance.cache).toBeNull();
  });

  test('Estado inicial: server es null', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(instance.server).toBeNull();
  });

  test('Estado inicial: pipeline está definido', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(instance.pipeline).toBeDefined();
  });

  test('Estado inicial: errorGuardian está definido', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(instance.errorGuardian).toBeDefined();
  });

  test('Estado inicial: OmnySysDataPath apunta a .omnysysdata', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(instance.OmnySysDataPath).toContain('.omnysysdata');
  });

  // ─── Herencia de EventEmitter ─────────────────────────────────

  test('El servidor es un EventEmitter (tiene on/emit)', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    expect(typeof instance.on).toBe('function');
    expect(typeof instance.emit).toBe('function');
    expect(typeof instance.removeListener).toBe('function');
  });

  test('Se pueden registrar event listeners', () => {
    const instance = new OmnySysMCPServer(process.cwd());
    const handler = () => {};
    expect(() => {
      instance.on('test-event', handler);
      instance.removeListener('test-event', handler);
    }).not.toThrow();
  });

  // ─── Múltiples instancias ──────────────────────────────────────

  test('Se pueden crear múltiples instancias con diferentes paths', () => {
    const instance1 = new OmnySysMCPServer('/path/to/project1');
    const instance2 = new OmnySysMCPServer('/path/to/project2');

    expect(instance1.projectPath).toBe('/path/to/project1');
    expect(instance2.projectPath).toBe('/path/to/project2');
    expect(instance1).not.toBe(instance2);
  });
});
