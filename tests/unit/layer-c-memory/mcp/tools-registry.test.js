/**
 * @fileoverview Tests for MCP Tools Registry
 * @module tests/unit/layer-c-memory/mcp/tools-registry.test
 */

import { describe, it, expect } from 'vitest';
import { toolDefinitions, toolHandlers } from '#layer-c/mcp/tools/index.js';

describe('MCP Tools Registry', () => {
  describe('toolDefinitions array', () => {
    it('is a valid array', () => {
      expect(Array.isArray(toolDefinitions)).toBe(true);
      expect(toolDefinitions.length).toBeGreaterThan(0);
    });

    it('has all required properties', () => {
      for (const def of toolDefinitions) {
        expect(def).toHaveProperty('name');
        expect(def).toHaveProperty('description');
        expect(def).toHaveProperty('inputSchema');
        expect(typeof def.name).toBe('string');
        expect(typeof def.description).toBe('string');
        expect(typeof def.inputSchema).toBe('object');
      }
    });

    it('has unique tool names', () => {
      const names = toolDefinitions.map(d => d.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('toolHandlers object', () => {
    it('is a valid object', () => {
      expect(typeof toolHandlers).toBe('object');
      expect(toolHandlers).not.toBeNull();
    });

    it('has handlers for all defined tools', () => {
      for (const def of toolDefinitions) {
        expect(toolHandlers).toHaveProperty(def.name);
        expect(typeof toolHandlers[def.name]).toBe('function');
      }
    });

    it('has only handlers for defined tools', () => {
      const definedNames = new Set(toolDefinitions.map(d => d.name));
      for (const handlerName of Object.keys(toolHandlers)) {
        expect(definedNames.has(handlerName)).toBe(true);
      }
    });
  });

  describe('inputSchema validation', () => {
    it('each tool has valid inputSchema type', () => {
      for (const def of toolDefinitions) {
        expect(def.inputSchema.type).toBe('object');
      }
    });

    it('each tool has properties in inputSchema', () => {
      for (const def of toolDefinitions) {
        expect(def.inputSchema).toHaveProperty('properties');
        expect(typeof def.inputSchema.properties).toBe('object');
      }
    });

    it('required fields are defined in properties', () => {
      for (const def of toolDefinitions) {
        if (def.inputSchema.required) {
          for (const req of def.inputSchema.required) {
            expect(def.inputSchema.properties).toHaveProperty(req);
          }
        }
      }
    });
  });

  describe('tool descriptions', () => {
    it('each tool has non-empty description', () => {
      for (const def of toolDefinitions) {
        expect(def.description.length).toBeGreaterThan(0);
      }
    });

    it('descriptions are meaningful (not just the tool name)', () => {
      for (const def of toolDefinitions) {
        expect(def.description).not.toBe(def.name);
      }
    });
  });

  describe('specific tools', () => {
    it('get_impact_map is registered', () => {
      const tool = toolDefinitions.find(d => d.name === 'get_impact_map');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toContain('filePath');
    });

    it('get_risk_assessment is registered', () => {
      const tool = toolDefinitions.find(d => d.name === 'get_risk_assessment');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty('minSeverity');
    });

    it('search_files is registered', () => {
      const tool = toolDefinitions.find(d => d.name === 'search_files');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toContain('pattern');
    });

    it('atomic_edit is registered', () => {
      const tool = toolDefinitions.find(d => d.name === 'atomic_edit');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toEqual(['filePath', 'oldString', 'newString']);
    });

    it('atomic_write is registered', () => {
      const tool = toolDefinitions.find(d => d.name === 'atomic_write');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toEqual(['filePath', 'content']);
    });
  });
});
