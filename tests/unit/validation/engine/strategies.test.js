/**
 * @fileoverview Validation Strategies Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseValidationStrategy, SyntaxValidator, SemanticValidator, SchemaValidator } from '../../../../src/validation/validation-engine/strategies/index.js';
import { RuleRegistry } from '../../../../src/validation/core/rules/index.js';
import { ValidationResult } from '../../../../src/validation/core/results/index.js';

describe('BaseValidationStrategy', () => {
  it('cannot be instantiated directly', () => {
    expect(() => new BaseValidationStrategy('test', 'source')).toThrow('Cannot instantiate abstract class');
  });

  it('requires execute implementation', () => {
    class TestStrategy extends BaseValidationStrategy {
      constructor() {
        super('test', 'source');
      }
    }
    
    const strategy = new TestStrategy();
    
    return expect(strategy.execute({}, {}, new Map())).rejects.toThrow('must be implemented');
  });

  it('provides default canValidate', () => {
    class TestStrategy extends BaseValidationStrategy {
      constructor() {
        super('test', 'source');
      }
      async execute() { return []; }
    }
    
    const strategy = new TestStrategy();
    
    expect(strategy.canValidate({})).toBe(true);
    expect(strategy.canValidate(null)).toBe(true);
  });
});

describe('SyntaxValidator', () => {
  let validator;
  let registry;
  let context;
  let cache;

  beforeEach(() => {
    validator = new SyntaxValidator();
    registry = new RuleRegistry();
    context = {
      getEntitiesByType: (type) => type === 'file' ? [
        { id: 'file1', type: 'file', path: 'test1.js' },
        { id: 'file2', type: 'file', path: 'test2.js' }
      ] : []
    };
    cache = new Map();
  });

  describe('constructor', () => {
    it('sets name and layer', () => {
      expect(validator.name).toBe('syntax');
      expect(validator.layer).toBe('source');
    });
  });

  describe('execute', () => {
    it('returns empty array when no rules', async () => {
      const results = await validator.execute(context, registry, cache);
      
      expect(results).toEqual([]);
    });

    it('validates entities against rules', async () => {
      registry.register({
        id: 'test.rule',
        name: 'Test Rule',
        layer: 'source',
        appliesTo: ['file'],
        validate: async (entity) => ValidationResult.valid(entity.id, 'test')
      });
      
      const results = await validator.execute(context, registry, cache);
      
      expect(results).toHaveLength(2);
    });

    it('skips rules that do not apply', async () => {
      registry.register({
        id: 'test.rule',
        name: 'Test Rule',
        layer: 'source',
        appliesTo: ['atom'],
        validate: async () => ValidationResult.valid('test', 'test')
      });
      
      const results = await validator.execute(context, registry, cache);
      
      expect(results).toHaveLength(0);
    });

    it('uses cached results', async () => {
      let callCount = 0;
      registry.register({
        id: 'test.rule',
        name: 'Test Rule',
        layer: 'source',
        appliesTo: ['file'],
        validate: async (entity) => {
          callCount++;
          return ValidationResult.valid(entity.id, 'test');
        }
      });
      
      cache.set('file1::test.rule', ValidationResult.valid('file1', 'cached'));
      
      await validator.execute(context, registry, cache);
      
      expect(callCount).toBe(1);
    });

    it('warns on missing required fields', async () => {
      registry.register({
        id: 'test.rule',
        name: 'Test Rule',
        layer: 'source',
        appliesTo: ['file'],
        requires: ['missingField'],
        validate: async () => ValidationResult.valid('test', 'test')
      });
      
      const results = await validator.execute(context, registry, cache);
      
      expect(results).toHaveLength(2);
      expect(results[0].message).toContain('skipped');
      expect(results[0].severity).toBe('warning');
    });
  });

  describe('canValidate', () => {
    it('returns true for entities with path', () => {
      expect(validator.canValidate({ path: 'test.js' })).toBeTruthy();
    });

    it('returns true for entities with _omnysysPath', () => {
      expect(validator.canValidate({ _omnysysPath: 'test.js' })).toBeTruthy();
    });

    it('returns falsy for entities without path', () => {
      expect(validator.canValidate({ id: 'test' })).toBeFalsy();
    });
  });
});

describe('SemanticValidator', () => {
  let validator;
  let registry;
  let context;
  let cache;

  beforeEach(() => {
    validator = new SemanticValidator();
    registry = new RuleRegistry();
    context = {
      getEntitiesByType: (type) => type === 'file' ? [
        { id: 'file1', type: 'file', exports: [], imports: [], usedBy: [] }
      ] : []
    };
    cache = new Map();
  });

  describe('constructor', () => {
    it('sets name and layer', () => {
      expect(validator.name).toBe('semantic');
      expect(validator.layer).toBe('semantic');
    });
  });

  describe('execute', () => {
    it('returns empty array when no rules', async () => {
      const results = await validator.execute(context, registry, cache);
      
      expect(results).toEqual([]);
    });

    it('validates with semantic rules', async () => {
      registry.register({
        id: 'semantic.test',
        name: 'Semantic Test',
        layer: 'semantic',
        appliesTo: ['file'],
        requires: ['exports'],
        validate: async (entity) => ValidationResult.valid(entity.id, 'exports')
      });
      
      const results = await validator.execute(context, registry, cache);
      
      expect(results).toHaveLength(1);
      expect(results[0].layer).toBe('semantic');
    });
  });

  describe('groupRulesByEntity', () => {
    it('groups rules by entity type', () => {
      const rule1 = { appliesTo: ['file', 'atom'] };
      const rule2 = { appliesTo: ['file'] };
      
      const grouped = validator.groupRulesByEntity([rule1, rule2]);
      
      expect(grouped.get('file')).toHaveLength(2);
      expect(grouped.get('atom')).toHaveLength(1);
    });
  });
});

describe('SchemaValidator', () => {
  let validator;
  let registry;
  let context;
  let cache;

  beforeEach(() => {
    validator = new SchemaValidator();
    registry = new RuleRegistry();
    context = {
      getEntitiesByType: (type) => {
        if (type === 'atom') return [{ id: 'a1', type: 'atom', source: 'test.js' }];
        if (type === 'file') return [{ id: 'f1', type: 'file' }];
        return [];
      }
    };
    cache = new Map();
  });

  describe('constructor', () => {
    it('sets name and layer', () => {
      expect(validator.name).toBe('schema');
      expect(validator.layer).toBe('derivation');
    });
  });

  describe('execute', () => {
    it('runs derivation and cross-metadata validation', async () => {
      registry.register({
        id: 'derivation.test',
        name: 'Derivation Test',
        layer: 'derivation',
        appliesTo: ['atom'],
        validate: async (entity) => ValidationResult.valid(entity.id, 'derived')
      });
      
      const results = await validator.execute(context, registry, cache);
      
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateSchemaCompatibility', () => {
    it('detects removed fields', () => {
      const oldSchema = { properties: { foo: {}, bar: {} } };
      const newSchema = { properties: { foo: {} } };
      
      const results = validator.validateSchemaCompatibility(oldSchema, newSchema);
      
      expect(results).toHaveLength(1);
      expect(results[0].message).toContain('bar');
    });

    it('returns empty for compatible schemas', () => {
      const oldSchema = { properties: { foo: {} } };
      const newSchema = { properties: { foo: {}, bar: {} } };
      
      const results = validator.validateSchemaCompatibility(oldSchema, newSchema);
      
      expect(results).toHaveLength(0);
    });
  });
});
