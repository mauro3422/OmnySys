import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { LLMResponseBuilder } from '#test-factories/ai/builders.js';

describe('Analysis Schema', () => {
  let schema;

  beforeAll(async () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.resolve(__dirname, '../../../src/ai/analysis-schema.json');
    const content = await fs.readFile(schemaPath, 'utf-8');
    schema = JSON.parse(content);
  });

  describe('schema structure', () => {
    it('should be a valid JSON Schema object', () => {
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.required).toBeDefined();
    });

    it('should have all required fields', () => {
      expect(schema.required).toContain('sharedState');
      expect(schema.required).toContain('events');
      expect(schema.required).toContain('hiddenConnections');
      expect(schema.required).toContain('suggestedConnections');
      expect(schema.required).toContain('subsystemStatus');
      expect(schema.required).toContain('confidence');
      expect(schema.required).toContain('reasoning');
    });
  });

  describe('sharedState schema', () => {
    it('should define sharedState as array', () => {
      expect(schema.properties.sharedState.type).toBe('array');
    });

    it('should require property and type in items', () => {
      const itemSchema = schema.properties.sharedState.items;
      expect(itemSchema.required).toContain('property');
      expect(itemSchema.required).toContain('type');
    });

    it('should limit type to read/write', () => {
      const typeSchema = schema.properties.sharedState.items.properties.type;
      expect(typeSchema.enum).toContain('read');
      expect(typeSchema.enum).toContain('write');
    });

    it('should define line as number', () => {
      const lineSchema = schema.properties.sharedState.items.properties.line;
      expect(lineSchema.type).toBe('number');
    });
  });

  describe('events schema', () => {
    it('should define events as array', () => {
      expect(schema.properties.events.type).toBe('array');
    });

    it('should require name and type in items', () => {
      const itemSchema = schema.properties.events.items;
      expect(itemSchema.required).toContain('name');
      expect(itemSchema.required).toContain('type');
    });

    it('should limit type to emit/listen', () => {
      const typeSchema = schema.properties.events.items.properties.type;
      expect(typeSchema.enum).toContain('emit');
      expect(typeSchema.enum).toContain('listen');
    });
  });

  describe('connections schema', () => {
    it('should define hiddenConnections as array', () => {
      expect(schema.properties.hiddenConnections.type).toBe('array');
    });

    it('should define suggestedConnections as array', () => {
      expect(schema.properties.suggestedConnections.type).toBe('array');
    });

    it('should require all fields in connection items', () => {
      const hiddenItemSchema = schema.properties.hiddenConnections.items;
      expect(hiddenItemSchema.required).toContain('targetFile');
      expect(hiddenItemSchema.required).toContain('reason');
      expect(hiddenItemSchema.required).toContain('confidence');
    });

    it('should constrain confidence between 0 and 1', () => {
      const confSchema = schema.properties.hiddenConnections.items.properties.confidence;
      expect(confSchema.minimum).toBe(0);
      expect(confSchema.maximum).toBe(1);
    });
  });

  describe('subsystemStatus schema', () => {
    it('should limit to valid values', () => {
      const statusSchema = schema.properties.subsystemStatus;
      expect(statusSchema.enum).toContain('isolated');
      expect(statusSchema.enum).toContain('connected');
      expect(statusSchema.enum).toContain('orphan');
      expect(statusSchema.enum).toContain('unknown');
    });
  });

  describe('confidence schema', () => {
    it('should be a number', () => {
      expect(schema.properties.confidence.type).toBe('number');
    });

    it('should be between 0 and 1', () => {
      expect(schema.properties.confidence.minimum).toBe(0);
      expect(schema.properties.confidence.maximum).toBe(1);
    });
  });

  describe('reasoning schema', () => {
    it('should be a string', () => {
      expect(schema.properties.reasoning.type).toBe('string');
    });
  });
});

describe('Schema Validation with Builder', () => {
  let schema;

  beforeAll(async () => {
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.resolve(__dirname, '../../../src/ai/analysis-schema.json');
    const content = await fs.readFile(schemaPath, 'utf-8');
    schema = JSON.parse(content);
  });

  function validateAgainstSchema(data, schemaDef) {
    if (schemaDef.type === 'object') {
      if (typeof data !== 'object' || data === null) return false;
      
      if (schemaDef.required) {
        for (const field of schemaDef.required) {
          if (!(field in data)) return false;
        }
      }
      
      if (schemaDef.properties) {
        for (const [key, propSchema] of Object.entries(schemaDef.properties)) {
          if (key in data && !validateAgainstSchema(data[key], propSchema)) {
            return false;
          }
        }
      }
      return true;
    }
    
    if (schemaDef.type === 'array') {
      if (!Array.isArray(data)) return false;
      if (schemaDef.items) {
        return data.every(item => validateAgainstSchema(item, schemaDef.items));
      }
      return true;
    }
    
    if (schemaDef.type === 'string') {
      if (typeof data !== 'string') return false;
      if (schemaDef.enum && !schemaDef.enum.includes(data)) return false;
      return true;
    }
    
    if (schemaDef.type === 'number') {
      if (typeof data !== 'number') return false;
      if (schemaDef.minimum !== undefined && data < schemaDef.minimum) return false;
      if (schemaDef.maximum !== undefined && data > schemaDef.maximum) return false;
      return true;
    }
    
    return true;
  }

  it('should validate minimal valid response', () => {
    const response = LLMResponseBuilder.create().build();
    
    expect(validateAgainstSchema(response, schema)).toBe(true);
  });

  it('should validate response with all fields', () => {
    const response = LLMResponseBuilder.create()
      .withSharedState([
        { property: 'state.value', type: 'read', line: 10 },
        { property: 'store.data', type: 'write', line: 20 }
      ])
      .withEvents([
        { name: 'update', type: 'emit', line: 15 },
        { name: 'change', type: 'listen', line: 25 }
      ])
      .addHiddenConnection('./utils.js', 'helper function', 0.9)
      .withSuggestedConnections([
        { targetFile: './api.js', reason: 'API call', confidence: 0.8 }
      ])
      .asConnected()
      .build();

    expect(validateAgainstSchema(response, schema)).toBe(true);
  });

  it('should validate orphan status', () => {
    const response = LLMResponseBuilder.create()
      .asOrphan()
      .build();

    expect(validateAgainstSchema(response, schema)).toBe(true);
    expect(response.subsystemStatus).toBe('orphan');
  });

  it('should validate isolated status', () => {
    const response = LLMResponseBuilder.create()
      .asIsolated()
      .build();

    expect(validateAgainstSchema(response, schema)).toBe(true);
    expect(response.subsystemStatus).toBe('isolated');
  });

  it('should validate confidence boundaries', () => {
    const response = LLMResponseBuilder.create()
      .withConfidence(0)
      .build();

    expect(validateAgainstSchema(response, schema)).toBe(true);

    const response2 = LLMResponseBuilder.create()
      .withConfidence(1)
      .build();

    expect(validateAgainstSchema(response2, schema)).toBe(true);
  });

  it('should reject invalid subsystemStatus', () => {
    const response = {
      sharedState: [],
      events: [],
      hiddenConnections: [],
      suggestedConnections: [],
      subsystemStatus: 'invalid',
      confidence: 0.5,
      reasoning: 'test'
    };

    expect(validateAgainstSchema(response, schema)).toBe(false);
  });

  it('should reject missing required fields', () => {
    const response = {
      sharedState: [],
      events: []
    };

    expect(validateAgainstSchema(response, schema)).toBe(false);
  });

  it('should reject confidence out of range', () => {
    const response = {
      sharedState: [],
      events: [],
      hiddenConnections: [],
      suggestedConnections: [],
      subsystemStatus: 'unknown',
      confidence: 1.5,
      reasoning: 'test'
    };

    expect(validateAgainstSchema(response, schema)).toBe(false);
  });

  it('should reject invalid event type', () => {
    const response = {
      sharedState: [],
      events: [{ name: 'test', type: 'invalid', line: 1 }],
      hiddenConnections: [],
      suggestedConnections: [],
      subsystemStatus: 'unknown',
      confidence: 0.5,
      reasoning: 'test'
    };

    expect(validateAgainstSchema(response, schema)).toBe(false);
  });

  it('should reject invalid sharedState type', () => {
    const response = {
      sharedState: [{ property: 'test', type: 'invalid', line: 1 }],
      events: [],
      hiddenConnections: [],
      suggestedConnections: [],
      subsystemStatus: 'unknown',
      confidence: 0.5,
      reasoning: 'test'
    };

    expect(validateAgainstSchema(response, schema)).toBe(false);
  });
});
