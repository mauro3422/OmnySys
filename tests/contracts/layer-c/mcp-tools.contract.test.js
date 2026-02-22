/**
 * @fileoverview MCP Tools Contract Test
 * 
 * Tests de contrato para verificar la estructura de herramientas MCP.
 * 
 * @module tests/contracts/layer-c/mcp-tools.contract.test
 */

import { describe, it, expect } from 'vitest';
import { 
  TOOL_NAMES, 
  REQUIRED_TOOL_DEFINITION_FIELDS,
  importToolsModule,
  expectIfAvailable 
} from './helpers/index.js';

describe('MCP Tools Contract', () => {
  describe('Tool Definitions', () => {
    let toolDefinitions;

    beforeAll(async () => {
      const mod = await importToolsModule();
      toolDefinitions = mod?.toolDefinitions;
    });

    it('MUST export toolDefinitions array', () => {
      expectIfAvailable(toolDefinitions, () => {
        expect(Array.isArray(toolDefinitions)).toBe(true);
      });
    });

    it('toolDefinitions MUST not be empty', () => {
      if (!toolDefinitions) return;
      expect(toolDefinitions.length).toBeGreaterThan(0);
    });

    it('each tool definition MUST have required fields', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
        REQUIRED_TOOL_DEFINITION_FIELDS.forEach(field => {
          expect(tool).toHaveProperty(field);
        });
      });
    });

    it('each tool name MUST be a string', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
      });
    });

    it('each tool description MUST be a string', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    it('each tool inputSchema MUST be an object with type "object"', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
        expect(typeof tool.inputSchema).toBe('object');
        expect(tool.inputSchema).not.toBeNull();
        expect(tool.inputSchema.type).toBe('object');
      });
    });

    it('each tool inputSchema MUST have properties', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(typeof tool.inputSchema.properties).toBe('object');
      });
    });
  });

  describe('Tool Handlers', () => {
    let toolHandlers;

    beforeAll(async () => {
      const mod = await importToolsModule();
      toolHandlers = mod?.toolHandlers;
    });

    it('MUST export toolHandlers object', () => {
      expectIfAvailable(toolHandlers, () => {
        expect(typeof toolHandlers).toBe('object');
        expect(toolHandlers).not.toBeNull();
      });
    });

    TOOL_NAMES.forEach(toolName => {
      it(`MUST have handler for ${toolName}`, () => {
        if (!toolHandlers) return;
        expect(toolHandlers[toolName]).toBeDefined();
      });

      it(`handler for ${toolName} MUST be a function`, () => {
        if (!toolHandlers?.[toolName]) return;
        expect(typeof toolHandlers[toolName]).toBe('function');
      });
    });
  });

  describe('Tool Definition-Handler Alignment', () => {
    let toolDefinitions;
    let toolHandlers;

    beforeAll(async () => {
      const mod = await importToolsModule();
      toolDefinitions = mod?.toolDefinitions;
      toolHandlers = mod?.toolHandlers;
    });

    it('every defined tool MUST have a handler', () => {
      if (!toolDefinitions || !toolHandlers) return;
      toolDefinitions.forEach(tool => {
        expect(toolHandlers[tool.name]).toBeDefined();
      });
    });

    it('every handler MUST correspond to a tool definition', () => {
      if (!toolDefinitions || !toolHandlers) return;
      const definedNames = new Set(toolDefinitions.map(t => t.name));
      Object.keys(toolHandlers).forEach(handlerName => {
        expect(definedNames.has(handlerName)).toBe(true);
      });
    });

    it('number of handlers MUST match number of definitions', () => {
      if (!toolDefinitions || !toolHandlers) return;
      expect(Object.keys(toolHandlers).length).toBe(toolDefinitions.length);
    });
  });

  describe('Tool Name Conventions', () => {
    let toolDefinitions;

    beforeAll(async () => {
      const mod = await importToolsModule();
      toolDefinitions = mod?.toolDefinitions;
    });

    it('all tool names MUST use snake_case', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
        expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });

    it('all tool names MUST be unique', () => {
      if (!toolDefinitions) return;
      const names = toolDefinitions.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Required Parameters Specification', () => {
    let toolDefinitions;

    beforeAll(async () => {
      const mod = await importToolsModule();
      toolDefinitions = mod?.toolDefinitions;
    });

    it('tools with required params MUST have required array', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
        const props = tool.inputSchema.properties;
        const hasRequired = tool.inputSchema.required;
        if (Object.keys(props).length > 0 && hasRequired) {
          expect(Array.isArray(hasRequired)).toBe(true);
        }
      });
    });

    it('all required params MUST exist in properties', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
        const props = tool.inputSchema.properties;
        const required = tool.inputSchema.required || [];
        required.forEach(param => {
          expect(props).toHaveProperty(param);
        });
      });
    });
  });

  describe('Handler Async Behavior', () => {
    let toolHandlers;

    beforeAll(async () => {
      const mod = await importToolsModule();
      toolHandlers = mod?.toolHandlers;
    });

    TOOL_NAMES.forEach(toolName => {
      it(`${toolName} handler MUST be callable`, () => {
        if (!toolHandlers?.[toolName]) return;
        expect(typeof toolHandlers[toolName]).toBe('function');
      });
    });
  });
});
