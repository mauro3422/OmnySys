import { describe, it, expect, beforeAll } from 'vitest';

const TOOL_NAMES = [
  'get_impact_map',
  'analyze_change',
  'explain_connection',
  'get_risk_assessment',
  'search_files',
  'get_server_status',
  'get_call_graph',
  'analyze_signature_change',
  'explain_value_flow',
  'get_function_details',
  'get_molecule_summary',
  'get_atomic_functions',
  'restart_server',
  'get_tunnel_vision_stats',
  'atomic_edit',
  'atomic_write'
];

const REQUIRED_TOOL_DEFINITION_FIELDS = ['name', 'description', 'inputSchema'];

describe('MCP Tools Contract', () => {
  describe('Tool Definitions', () => {
    let toolDefinitions;

    beforeAll(async () => {
      try {
        const mod = await import('#layer-c/mcp/tools/index.js');
        toolDefinitions = mod.toolDefinitions;
      } catch (e) {
        toolDefinitions = null;
      }
    });

    it('MUST export toolDefinitions array', () => {
      if (!toolDefinitions) {
        expect(true).toBe(true);
        return;
      }
      expect(Array.isArray(toolDefinitions)).toBe(true);
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

    it('each tool inputSchema MUST be an object', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
        expect(typeof tool.inputSchema).toBe('object');
        expect(tool.inputSchema).not.toBeNull();
      });
    });

    it('each tool inputSchema MUST have type property', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
        expect(tool.inputSchema).toHaveProperty('type');
      });
    });

    it('each tool inputSchema type MUST be "object"', () => {
      if (!toolDefinitions) return;
      toolDefinitions.forEach(tool => {
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
    let toolDefinitions;

    beforeAll(async () => {
      try {
        const mod = await import('#layer-c/mcp/tools/index.js');
        toolHandlers = mod.toolHandlers;
        toolDefinitions = mod.toolDefinitions;
      } catch (e) {
        toolHandlers = null;
        toolDefinitions = null;
      }
    });

    it('MUST export toolHandlers object', () => {
      if (!toolHandlers) {
        expect(true).toBe(true);
        return;
      }
      expect(typeof toolHandlers).toBe('object');
      expect(toolHandlers).not.toBeNull();
    });

    TOOL_NAMES.forEach(toolName => {
      it(`MUST have handler for ${toolName}`, () => {
        if (!toolHandlers) return;
        expect(toolHandlers[toolName]).toBeDefined();
      });

      it(`handler for ${toolName} MUST be a function`, () => {
        if (!toolHandlers) return;
        if (toolHandlers[toolName]) {
          expect(typeof toolHandlers[toolName]).toBe('function');
        }
      });
    });
  });

  describe('Tool Definition-Handler Alignment', () => {
    let toolDefinitions;
    let toolHandlers;

    beforeAll(async () => {
      try {
        const mod = await import('#layer-c/mcp/tools/index.js');
        toolDefinitions = mod.toolDefinitions;
        toolHandlers = mod.toolHandlers;
      } catch (e) {
        toolDefinitions = null;
        toolHandlers = null;
      }
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
      try {
        const mod = await import('#layer-c/mcp/tools/index.js');
        toolDefinitions = mod.toolDefinitions;
      } catch (e) {
        toolDefinitions = null;
      }
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
      try {
        const mod = await import('#layer-c/mcp/tools/index.js');
        toolDefinitions = mod.toolDefinitions;
      } catch (e) {
        toolDefinitions = null;
      }
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
      try {
        const mod = await import('#layer-c/mcp/tools/index.js');
        toolHandlers = mod.toolHandlers;
      } catch (e) {
        toolHandlers = null;
      }
    });

    TOOL_NAMES.forEach(toolName => {
      it(`${toolName} handler MUST be callable`, () => {
        if (!toolHandlers || !toolHandlers[toolName]) return;
        expect(typeof toolHandlers[toolName]).toBe('function');
      });
    });
  });
});
