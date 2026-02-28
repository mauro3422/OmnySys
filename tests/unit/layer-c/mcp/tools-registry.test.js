/**
 * @fileoverview tools-registry.test.js
 *
 * Unit tests for the MCP Tools Registry (mcp/tools/index.js)
 *
 * Cubre:
 * - Todas las toolDefinitions tienen estructura válida (name, description, inputSchema)
 * - Todos los toolDefinitions tienen su handler correspondiente en toolHandlers
 * - Todos los handlers son funciones invocables
 * - No hay handlers huérfanos (handler sin definition)
 * - Los inputSchema son JSON Schema válidos (type: 'object')
 * - Las tools con required[] tienen esos campos en properties
 *
 * @module tests/unit/layer-c/mcp/tools-registry
 */

import { describe, test, expect } from 'vitest';
import { toolDefinitions, toolHandlers } from '#layer-c/mcp/tools/index.js';

// ─── Tools Registry ───────────────────────────────────────────────────────────

describe('MCP Tools Registry — toolDefinitions', () => {

  test('toolDefinitions es un array no vacío', () => {
    expect(Array.isArray(toolDefinitions)).toBe(true);
    expect(toolDefinitions.length).toBeGreaterThan(0);
  });

  test('existen al menos 16 tools registradas (inventario unificado)', () => {
    // Inventario unificado Fase 17: ~16 tools
    expect(toolDefinitions.length).toBeGreaterThanOrEqual(16);
  });

  // ── Estructura de cada tool definition ────────────────────────────────────

  test.each(
    toolDefinitions.map(t => [t.name, t])
  )('tool "%s" tiene name (string)', (name, tool) => {
    expect(typeof tool.name).toBe('string');
    expect(tool.name.length).toBeGreaterThan(0);
  });

  test.each(
    toolDefinitions.map(t => [t.name, t])
  )('tool "%s" tiene description (string no vacío)', (name, tool) => {
    expect(typeof tool.description).toBe('string');
    expect(tool.description.length).toBeGreaterThan(0);
  });

  test.each(
    toolDefinitions.map(t => [t.name, t])
  )('tool "%s" tiene inputSchema con type: object', (name, tool) => {
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
  });

  test.each(
    toolDefinitions.map(t => [t.name, t])
  )('tool "%s": si tiene required[], los campos están en properties', (name, tool) => {
    const { inputSchema } = tool;
    if (inputSchema.required && inputSchema.required.length > 0) {
      expect(inputSchema.properties).toBeDefined();
      for (const requiredField of inputSchema.required) {
        expect(
          inputSchema.properties[requiredField],
          `Tool "${name}": campo required "${requiredField}" no está en properties`
        ).toBeDefined();
      }
    }
  });

  // ── Los names son únicos ────────────────────────────────────────────────────

  test('todos los tool names son únicos', () => {
    const names = toolDefinitions.map(t => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  // ── Naming convention ──────────────────────────────────────────────────────

  test('todos los tool names usan snake_case', () => {
    for (const tool of toolDefinitions) {
      expect(
        tool.name,
        `Tool "${tool.name}" no usa snake_case`
      ).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});

// ─── toolHandlers ────────────────────────────────────────────────────────────

describe('MCP Tools Registry — toolHandlers', () => {

  test('toolHandlers es un objeto no vacío', () => {
    expect(typeof toolHandlers).toBe('object');
    expect(Object.keys(toolHandlers).length).toBeGreaterThan(0);
  });

  test('cada toolDefinition tiene un handler correspondiente', () => {
    for (const tool of toolDefinitions) {
      expect(
        toolHandlers[tool.name],
        `Tool "${tool.name}" no tiene handler en toolHandlers`
      ).toBeDefined();
    }
  });

  test('todos los handlers son funciones', () => {
    for (const [name, handler] of Object.entries(toolHandlers)) {
      expect(
        typeof handler,
        `Handler "${name}" no es una función`
      ).toBe('function');
    }
  });

  test('no hay handlers huérfanos (sin definition)', () => {
    const definedNames = new Set(toolDefinitions.map(t => t.name));
    for (const handlerName of Object.keys(toolHandlers)) {
      expect(
        definedNames.has(handlerName),
        `Handler "${handlerName}" no tiene toolDefinition correspondiente`
      ).toBe(true);
    }
  });

  // ── Herramientas conocidas del inventario ──────────────────────────────────

  test.each([
    'mcp_omnysystem_query_graph',
    'mcp_omnysystem_traverse_graph',
    'mcp_omnysystem_aggregate_metrics',
    'mcp_omnysystem_execute_solid_split',
    'mcp_omnysystem_suggest_refactoring',
    'mcp_omnysystem_move_file',
    'mcp_omnysystem_fix_imports',
    'mcp_omnysystem_validate_imports',
    'mcp_omnysystem_generate_tests',
    'mcp_omnysystem_generate_batch_tests',
    'mcp_omnysystem_get_recent_errors',
    'mcp_omnysystem_get_server_status',
    'mcp_omnysystem_restart_server',
    'mcp_omnysystem_atomic_edit',
    'mcp_omnysystem_atomic_write',
    'mcp_omnysystem_get_atom_schema'
  ])('la tool conocida "%s" está registrada', (toolName) => {
    const def = toolDefinitions.find(t => t.name === toolName);
    expect(def, `Tool "${toolName}" no está en toolDefinitions`).toBeDefined();
    expect(toolHandlers[toolName], `Tool "${toolName}" no tiene handler`).toBeDefined();
  });
});

// ─── Integridad de toolDefinitions y toolHandlers ─────────────────────────────

describe('MCP Tools Registry — integridad definitions ↔ handlers', () => {

  test('el número de definitions iguala el de handlers', () => {
    const defCount = toolDefinitions.length;
    const handlerCount = Object.keys(toolHandlers).length;
    expect(defCount).toBe(handlerCount);
  });

  test('los nombres de definitions y handlers son equivalentes (mismo set)', () => {
    const defNames = new Set(toolDefinitions.map(t => t.name));
    const handlerNames = new Set(Object.keys(toolHandlers));

    // Cada definition tiene handler
    for (const name of defNames) {
      expect(handlerNames.has(name)).toBe(true);
    }
    // Cada handler tiene definition
    for (const name of handlerNames) {
      expect(defNames.has(name)).toBe(true);
    }
  });
});
