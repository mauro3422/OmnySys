/**
 * @fileoverview Derivation Validation Rules Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComplexityCalculationRule } from '../../../../src/validation/rules/derivation/complexity-calculation.js';
import { RiskCalculationRule } from '../../../../src/validation/rules/derivation/risk-calculation.js';
import { ValidationResult } from '../../../../src/validation/core/results/index.js';

describe('ComplexityCalculationRule', () => {
  let context;

  beforeEach(() => {
    context = {
      atoms: new Map()
    };
  });

  describe('configuration', () => {
    it('has correct id', () => {
      expect(ComplexityCalculationRule.id).toBe('derivation.complexity-calculation');
    });

    it('is invariant', () => {
      expect(ComplexityCalculationRule.invariant).toBe(true);
    });

    it('is fixable', () => {
      expect(ComplexityCalculationRule.fixable).toBe(true);
    });

    it('applies to molecule and file', () => {
      expect(ComplexityCalculationRule.appliesTo).toContain('molecule');
      expect(ComplexityCalculationRule.appliesTo).toContain('file');
    });

    it('requires totalComplexity and atoms', () => {
      expect(ComplexityCalculationRule.requires).toContain('totalComplexity');
      expect(ComplexityCalculationRule.requires).toContain('atoms');
    });
  });

  describe('validate', () => {
    it('returns valid when complexity matches sum', async () => {
      context.atoms.set('func1', { id: 'func1', complexity: 5 });
      context.atoms.set('func2', { id: 'func2', complexity: 3 });
      
      const entity = {
        id: 'file.js',
        totalComplexity: 8,
        atoms: ['func1', 'func2']
      };
      
      const result = await ComplexityCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
    });

    it('returns invalid when complexity mismatch', async () => {
      context.atoms.set('func1', { id: 'func1', complexity: 5 });
      context.atoms.set('func2', { id: 'func2', complexity: 3 });
      
      const entity = {
        id: 'file.js',
        totalComplexity: 10,
        atoms: ['func1', 'func2']
      };
      
      const result = await ComplexityCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(false);
      expect(result.expected).toBe(8);
      expect(result.actual).toBe(10);
    });

    it('warns when no atoms found', async () => {
      const entity = {
        id: 'file.js',
        totalComplexity: 0,
        atoms: []
      };
      
      const result = await ComplexityCalculationRule.validate(entity, context);
      
      expect(result.severity).toBe('warning');
    });

    it('handles atoms with metadata.complexity', async () => {
      context.atoms.set('func1', { id: 'func1', metadata: { complexity: 7 } });
      
      const entity = {
        id: 'file.js',
        totalComplexity: 7,
        atoms: ['func1']
      };
      
      const result = await ComplexityCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
    });

    it('handles atom references as objects', async () => {
      const entity = {
        id: 'file.js',
        totalComplexity: 5,
        atoms: [{ id: 'func1', complexity: 5 }]
      };
      
      const result = await ComplexityCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
    });

    it('handles definitions array', async () => {
      const entity = {
        id: 'file.js',
        totalComplexity: 4,
        atoms: [],
        definitions: [
          { id: 'func1', complexity: 2 },
          { id: 'func2', complexity: 2 }
        ]
      };
      
      const result = await ComplexityCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
    });

    it('calculates average per atom', async () => {
      context.atoms.set('func1', { id: 'func1', complexity: 6 });
      context.atoms.set('func2', { id: 'func2', complexity: 4 });
      
      const entity = {
        id: 'file.js',
        totalComplexity: 10,
        atoms: ['func1', 'func2']
      };
      
      const result = await ComplexityCalculationRule.validate(entity, context);
      
      expect(result.details.averagePerAtom).toBe(5);
    });
  });

  describe('fix', () => {
    it('returns correct complexity sum', async () => {
      context.atoms.set('func1', { id: 'func1', complexity: 5 });
      context.atoms.set('func2', { id: 'func2', complexity: 3 });
      
      const entity = {
        id: 'file.js',
        atoms: ['func1', 'func2']
      };
      
      const fixed = await ComplexityCalculationRule.fix(entity, context, {});
      
      expect(fixed).toBe(8);
    });
  });
});

describe('RiskCalculationRule', () => {
  let context;

  beforeEach(() => {
    context = {
      atoms: new Map()
    };
  });

  describe('configuration', () => {
    it('has correct id', () => {
      expect(RiskCalculationRule.id).toBe('derivation.risk-calculation');
    });

    it('is invariant', () => {
      expect(RiskCalculationRule.invariant).toBe(true);
    });

    it('is fixable', () => {
      expect(RiskCalculationRule.fixable).toBe(true);
    });
  });

  describe('validate', () => {
    it('returns valid when risk is max severity', async () => {
      context.atoms.set('func1', { 
        id: 'func1', 
        archetype: { name: 'safe', severity: 1 } 
      });
      context.atoms.set('func2', { 
        id: 'func2', 
        archetype: { name: 'warning', severity: 3 } 
      });
      
      const entity = {
        id: 'file.js',
        riskScore: 3,
        atoms: ['func1', 'func2']
      };
      
      const result = await RiskCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
    });

    it('returns invalid when risk mismatch', async () => {
      context.atoms.set('func1', { 
        id: 'func1', 
        archetype: { name: 'critical', severity: 5 } 
      });
      
      const entity = {
        id: 'file.js',
        riskScore: 2,
        atoms: ['func1']
      };
      
      const result = await RiskCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(false);
      expect(result.expected).toBe(5);
      expect(result.actual).toBe(2);
    });

    it('returns valid when no atoms', async () => {
      const entity = {
        id: 'file.js',
        riskScore: 0,
        atoms: []
      };
      
      const result = await RiskCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
    });

    it('handles metadata.archetype', async () => {
      context.atoms.set('func1', { 
        id: 'func1', 
        metadata: { archetype: { name: 'risky', severity: 4 } }
      });
      
      const entity = {
        id: 'file.js',
        riskScore: 4,
        atoms: ['func1']
      };
      
      const result = await RiskCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
    });

    it('handles definitions array', async () => {
      const entity = {
        id: 'file.js',
        riskScore: 3,
        atoms: [],
        definitions: [
          { id: 'func1', archetype: { severity: 1 } },
          { id: 'func2', archetype: { severity: 3 } }
        ]
      };
      
      const result = await RiskCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
    });

    it('handles missing archetype gracefully', async () => {
      context.atoms.set('func1', { id: 'func1' });
      
      const entity = {
        id: 'file.js',
        riskScore: 0,
        atoms: ['func1']
      };
      
      const result = await RiskCalculationRule.validate(entity, context);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('fix', () => {
    it('returns max severity', async () => {
      context.atoms.set('func1', { 
        id: 'func1', 
        archetype: { severity: 2 } 
      });
      context.atoms.set('func2', { 
        id: 'func2', 
        archetype: { severity: 5 } 
      });
      
      const entity = {
        id: 'file.js',
        atoms: ['func1', 'func2']
      };
      
      const fixed = await RiskCalculationRule.fix(entity, context, {});
      
      expect(fixed).toBe(5);
    });
  });
});
