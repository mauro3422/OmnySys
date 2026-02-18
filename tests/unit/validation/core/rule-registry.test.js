/**
 * @fileoverview RuleRegistry and ValidationRule Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RuleRegistry, ValidationRule, createRule, resetGlobalRegistry, getGlobalRegistry } from '../../../../src/validation/core/rules/index.js';
import { ValidationResult, ValidationSeverity } from '../../../../src/validation/core/results/index.js';

describe('ValidationRule', () => {
  describe('constructor', () => {
    it('creates rule with config', () => {
      const rule = new ValidationRule({
        id: 'test.rule',
        name: 'Test Rule',
        description: 'A test rule',
        layer: 'source',
        appliesTo: ['file', 'molecule']
      });
      
      expect(rule.id).toBe('test.rule');
      expect(rule.name).toBe('Test Rule');
      expect(rule.layer).toBe('source');
      expect(rule.appliesTo).toEqual(['file', 'molecule']);
      expect(rule.invariant).toBe(false);
      expect(rule.fixable).toBe(false);
    });

    it('sets defaults for optional fields', () => {
      const rule = new ValidationRule({ id: 'test', name: 'Test' });
      
      expect(rule.description).toBe('');
      expect(rule.layer).toBe('source');
      expect(rule.appliesTo).toEqual([]);
      expect(rule.requires).toEqual([]);
    });
  });

  describe('appliesToEntity', () => {
    it('returns true when entity type matches', () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        appliesTo: ['file', 'atom']
      });
      
      expect(rule.appliesToEntity({ type: 'file' })).toBe(true);
      expect(rule.appliesToEntity({ type: 'atom' })).toBe(true);
    });

    it('returns false when entity type does not match', () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        appliesTo: ['file']
      });
      
      expect(rule.appliesToEntity({ type: 'molecule' })).toBe(false);
    });

    it('handles missing entity type', () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        appliesTo: ['file']
      });
      
      expect(rule.appliesToEntity({})).toBe(false);
      expect(rule.appliesToEntity({ type: 'unknown' })).toBe(false);
    });
  });

  describe('hasRequiredFields', () => {
    it('returns true when all required fields exist', () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        requires: ['path', 'exports']
      });
      
      const entity = { path: 'test.js', exports: [] };
      
      expect(rule.hasRequiredFields(entity, {})).toBe(true);
    });

    it('returns false when required field is missing', () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        requires: ['path', 'exports']
      });
      
      const entity = { path: 'test.js' };
      
      expect(rule.hasRequiredFields(entity, {})).toBe(false);
    });

    it('checks nested fields with dot notation', () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        requires: ['metadata.complexity']
      });
      
      const entity = { metadata: { complexity: 5 } };
      
      expect(rule.hasRequiredFields(entity, {})).toBe(true);
    });

    it('finds fields in context if not in entity', () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        requires: ['projectPath']
      });
      
      const entity = {};
      const context = { projectPath: '/test' };
      
      expect(rule.hasRequiredFields(entity, context)).toBe(true);
    });
  });

  describe('getFieldValue', () => {
    let rule;

    beforeEach(() => {
      rule = new ValidationRule({ id: 'test', name: 'Test' });
    });

    it('gets direct field from entity', () => {
      const entity = { path: 'test.js' };
      
      expect(rule.getFieldValue(entity, {}, 'path')).toBe('test.js');
    });

    it('gets nested field with dot notation', () => {
      const entity = { metadata: { complexity: 5 } };
      
      expect(rule.getFieldValue(entity, {}, 'metadata.complexity')).toBe(5);
    });

    it('returns undefined for missing nested field', () => {
      const entity = { metadata: {} };
      
      expect(rule.getFieldValue(entity, {}, 'metadata.missing')).toBe(undefined);
    });

    it('falls back to context', () => {
      const entity = {};
      const context = { projectPath: '/test' };
      
      expect(rule.getFieldValue(entity, context, 'projectPath')).toBe('/test');
    });
  });

  describe('validate', () => {
    it('executes validate function and returns result', async () => {
      const rule = new ValidationRule({
        id: 'test.rule',
        name: 'Test',
        validate: async (entity, context) => {
          return ValidationResult.valid(entity.id, 'test');
        }
      });
      
      const result = await rule.validate({ id: 'e1' }, {});
      
      expect(result.valid).toBe(true);
      expect(result.rule).toBe('test.rule');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('returns valid result when validate returns true', async () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        validate: async () => true
      });
      
      const result = await rule.validate({ id: 'e1' }, {});
      
      expect(result.valid).toBe(true);
    });

    it('returns invalid result when validate returns false', async () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        validate: async () => false
      });
      
      const result = await rule.validate({ id: 'e1' }, {});
      
      expect(result.valid).toBe(false);
      expect(result.severity).toBe(ValidationSeverity.ERROR);
    });

    it('returns critical for invariant failure', async () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        invariant: true,
        validate: async () => false
      });
      
      const result = await rule.validate({ id: 'e1' }, {});
      
      expect(result.valid).toBe(false);
      expect(result.severity).toBe(ValidationSeverity.CRITICAL);
    });

    it('handles object result from validate', async () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        validate: async () => ({
          valid: false,
          message: 'Custom message',
          expected: 'foo',
          actual: 'bar',
          details: { extra: 'info' }
        })
      });
      
      const result = await rule.validate({ id: 'e1' }, {});
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Custom message');
      expect(result.expected).toBe('foo');
      expect(result.actual).toBe('bar');
    });

    it('handles errors in validate function', async () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        validate: async () => {
          throw new Error('Validation crashed');
        }
      });
      
      const result = await rule.validate({ id: 'e1' }, {});
      
      expect(result.valid).toBe(false);
      expect(result.severity).toBe(ValidationSeverity.CRITICAL);
      expect(result.actual).toContain('error: Validation crashed');
    });

    it('sets layer on result', async () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        layer: 'derivation',
        validate: async () => true
      });
      
      const result = await rule.validate({ id: 'e1' }, {});
      
      expect(result.layer).toBe('derivation');
    });
  });

  describe('fix', () => {
    it('returns null when not fixable', async () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        fixable: false
      });
      
      const result = await rule.fix({}, {}, {});
      
      expect(result).toBe(null);
    });

    it('executes fix function when fixable', async () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        fixable: true,
        fix: async (entity, context, validationResult) => {
          return 'fixed value';
        }
      });
      
      const result = await rule.fix({ id: 'e1' }, {}, {});
      
      expect(result).toBe('fixed value');
    });

    it('returns null on fix error', async () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        fixable: true,
        fix: async () => {
          throw new Error('Fix failed');
        }
      });
      
      const result = await rule.fix({}, {}, {});
      
      expect(result).toBe(null);
    });
  });
});

describe('RuleRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new RuleRegistry();
  });

  describe('register', () => {
    it('registers a rule', () => {
      const rule = new ValidationRule({
        id: 'test.rule',
        name: 'Test',
        layer: 'source',
        appliesTo: ['file']
      });
      
      registry.register(rule);
      
      expect(registry.has('test.rule')).toBe(true);
      expect(registry.get('test.rule')).toBe(rule);
    });

    it('registers rule config as ValidationRule', () => {
      registry.register({
        id: 'test.config',
        name: 'Config Rule',
        validate: async () => true
      });
      
      const rule = registry.get('test.config');
      expect(rule).toBeInstanceOf(ValidationRule);
    });

    it('adds rule to layer index', () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        layer: 'derivation'
      });
      
      registry.register(rule);
      
      expect(registry.getByLayer('derivation')).toContain(rule);
    });

    it('adds rule to entity type index', () => {
      const rule = new ValidationRule({
        id: 'test',
        name: 'Test',
        appliesTo: ['file', 'atom']
      });
      
      registry.register(rule);
      
      expect(registry.getByEntityType('file')).toContain(rule);
      expect(registry.getByEntityType('atom')).toContain(rule);
    });

    it('tracks invariants', () => {
      const rule = new ValidationRule({
        id: 'test.invariant',
        name: 'Invariant',
        invariant: true
      });
      
      registry.register(rule);
      
      expect(registry.getInvariants()).toContain(rule);
    });

    it('throws on duplicate id', () => {
      registry.register({ id: 'test', name: 'Test 1' });
      
      expect(() => {
        registry.register({ id: 'test', name: 'Test 2' });
      }).toThrow('already registered');
    });

    it('returns this for chaining', () => {
      const result = registry.register({ id: 'test', name: 'Test' });
      
      expect(result).toBe(registry);
    });
  });

  describe('registerMany', () => {
    it('registers multiple rules', () => {
      registry.registerMany([
        { id: 'rule1', name: 'Rule 1' },
        { id: 'rule2', name: 'Rule 2' }
      ]);
      
      expect(registry.has('rule1')).toBe(true);
      expect(registry.has('rule2')).toBe(true);
    });
  });

  describe('get', () => {
    it('returns rule by id', () => {
      const rule = new ValidationRule({ id: 'test', name: 'Test' });
      registry.register(rule);
      
      expect(registry.get('test')).toBe(rule);
    });

    it('returns undefined for unknown id', () => {
      expect(registry.get('unknown')).toBe(undefined);
    });
  });

  describe('getByLayer', () => {
    it('returns rules for layer', () => {
      const rule1 = new ValidationRule({ id: 'r1', name: 'R1', layer: 'source' });
      const rule2 = new ValidationRule({ id: 'r2', name: 'R2', layer: 'source' });
      const rule3 = new ValidationRule({ id: 'r3', name: 'R3', layer: 'derivation' });
      
      registry.registerMany([rule1, rule2, rule3]);
      
      expect(registry.getByLayer('source')).toEqual([rule1, rule2]);
      expect(registry.getByLayer('derivation')).toEqual([rule3]);
    });

    it('returns empty array for unknown layer', () => {
      expect(registry.getByLayer('unknown')).toEqual([]);
    });
  });

  describe('getByEntityType', () => {
    it('returns rules for entity type', () => {
      const rule1 = new ValidationRule({ id: 'r1', name: 'R1', appliesTo: ['file'] });
      const rule2 = new ValidationRule({ id: 'r2', name: 'R2', appliesTo: ['file', 'atom'] });
      
      registry.registerMany([rule1, rule2]);
      
      const fileRules = registry.getByEntityType('file');
      expect(fileRules).toHaveLength(2);
    });

    it('returns empty array for unknown type', () => {
      expect(registry.getByEntityType('unknown')).toEqual([]);
    });
  });

  describe('getInvariants', () => {
    it('returns only invariant rules', () => {
      const inv1 = new ValidationRule({ id: 'inv1', name: 'Inv1', invariant: true });
      const inv2 = new ValidationRule({ id: 'inv2', name: 'Inv2', invariant: true });
      const regular = new ValidationRule({ id: 'reg', name: 'Regular', invariant: false });
      
      registry.registerMany([inv1, inv2, regular]);
      
      const invariants = registry.getInvariants();
      expect(invariants).toHaveLength(2);
      expect(invariants).toContain(inv1);
      expect(invariants).toContain(inv2);
    });
  });

  describe('findApplicable', () => {
    it('finds rules applicable to entity with required fields', () => {
      registry.register({
        id: 'rule1',
        name: 'Rule 1',
        appliesTo: ['file'],
        requires: ['path']
      });
      
      registry.register({
        id: 'rule2',
        name: 'Rule 2',
        appliesTo: ['file'],
        requires: ['path', 'exports']
      });
      
      registry.register({
        id: 'rule3',
        name: 'Rule 3',
        appliesTo: ['atom'],
        requires: []
      });
      
      const entity = { type: 'file', path: 'test.js' };
      const applicable = registry.findApplicable(entity, {});
      
      expect(applicable).toHaveLength(1);
      expect(applicable[0].id).toBe('rule1');
    });
  });

  describe('list', () => {
    it('returns all rules', () => {
      registry.registerMany([
        { id: 'r1', name: 'R1' },
        { id: 'r2', name: 'R2' }
      ]);
      
      expect(registry.list()).toHaveLength(2);
    });
  });

  describe('has', () => {
    it('returns true for existing rule', () => {
      registry.register({ id: 'test', name: 'Test' });
      
      expect(registry.has('test')).toBe(true);
    });

    it('returns false for missing rule', () => {
      expect(registry.has('unknown')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('removes rule from registry', () => {
      const rule = new ValidationRule({ id: 'test', name: 'Test', appliesTo: ['file'] });
      registry.register(rule);
      
      const result = registry.unregister('test');
      
      expect(result).toBe(true);
      expect(registry.has('test')).toBe(false);
    });

    it('removes from layer index', () => {
      const rule = new ValidationRule({ id: 'test', name: 'Test', layer: 'source' });
      registry.register(rule);
      registry.unregister('test');
      
      expect(registry.getByLayer('source')).not.toContain(rule);
    });

    it('removes from entity index', () => {
      const rule = new ValidationRule({ id: 'test', name: 'Test', appliesTo: ['file'] });
      registry.register(rule);
      registry.unregister('test');
      
      expect(registry.getByEntityType('file')).not.toContain(rule);
    });

    it('removes from invariants', () => {
      const rule = new ValidationRule({ id: 'test', name: 'Test', invariant: true });
      registry.register(rule);
      registry.unregister('test');
      
      expect(registry.getInvariants()).not.toContain(rule);
    });

    it('returns false for unknown rule', () => {
      expect(registry.unregister('unknown')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('returns registry statistics', () => {
      registry.registerMany([
        { id: 'r1', name: 'R1', layer: 'source', appliesTo: ['file'], invariant: true },
        { id: 'r2', name: 'R2', layer: 'derivation', appliesTo: ['atom'] },
        { id: 'r3', name: 'R3', layer: 'source', appliesTo: ['file', 'atom'] }
      ]);
      
      const stats = registry.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byLayer.source).toBe(2);
      expect(stats.byLayer.derivation).toBe(1);
      expect(stats.invariants).toBe(1);
      expect(stats.byEntity.file).toBe(2);
      expect(stats.byEntity.atom).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all rules', () => {
      registry.registerMany([
        { id: 'r1', name: 'R1', invariant: true },
        { id: 'r2', name: 'R2', appliesTo: ['file'] }
      ]);
      
      registry.clear();
      
      expect(registry.list()).toHaveLength(0);
      expect(registry.getInvariants()).toHaveLength(0);
      expect(registry.getByEntityType('file')).toHaveLength(0);
    });
  });
});

describe('createRule', () => {
  it('creates a ValidationRule from config', () => {
    const rule = createRule({
      id: 'test',
      name: 'Test',
      validate: async () => true
    });
    
    expect(rule).toBeInstanceOf(ValidationRule);
    expect(rule.id).toBe('test');
  });
});

describe('Global Registry', () => {
  beforeEach(() => {
    resetGlobalRegistry();
  });

  describe('getGlobalRegistry', () => {
    it('returns singleton registry', () => {
      const reg1 = getGlobalRegistry();
      const reg2 = getGlobalRegistry();
      
      expect(reg1).toBe(reg2);
    });
  });

  describe('resetGlobalRegistry', () => {
    it('creates new registry', () => {
      const reg1 = getGlobalRegistry();
      reg1.register({ id: 'test', name: 'Test' });
      
      const reg2 = resetGlobalRegistry();
      
      expect(reg2).not.toBe(reg1);
      expect(reg2.has('test')).toBe(false);
    });
  });
});
