/**
 * @fileoverview ValidationResult and ValidationReport Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationResult, ValidationReport, ValidationSeverity, ValidationType } from '../../../../src/validation/core/results/index.js';

describe('ValidationResult', () => {
  describe('constructor', () => {
    it('creates result with default values', () => {
      const result = new ValidationResult();
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('unknown');
      expect(result.layer).toBe('unknown');
      expect(result.severity).toBe(ValidationSeverity.INFO);
      expect(result.entity).toBe(null);
      expect(result.field).toBe(null);
      expect(result.details).toEqual({});
    });

    it('creates result with provided options', () => {
      const result = new ValidationResult({
        valid: false,
        entity: 'src/test.js',
        field: 'exports',
        message: 'Missing export',
        severity: ValidationSeverity.ERROR,
        expected: ['default'],
        actual: []
      });
      
      expect(result.valid).toBe(false);
      expect(result.entity).toBe('src/test.js');
      expect(result.field).toBe('exports');
      expect(result.message).toBe('Missing export');
      expect(result.severity).toBe(ValidationSeverity.ERROR);
      expect(result.expected).toEqual(['default']);
      expect(result.actual).toEqual([]);
    });

    it('sets timestamp automatically', () => {
      const before = new Date().toISOString();
      const result = new ValidationResult();
      const after = new Date().toISOString();
      
      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });
  });

  describe('static factory methods', () => {
    it('creates valid result', () => {
      const result = ValidationResult.valid('entity1', 'field1', { message: 'All good' });
      
      expect(result.valid).toBe(true);
      expect(result.entity).toBe('entity1');
      expect(result.field).toBe('field1');
      expect(result.severity).toBe(ValidationSeverity.INFO);
      expect(result.message).toBe('All good');
    });

    it('creates invalid result', () => {
      const result = ValidationResult.invalid('entity1', 'field1', 'expected', 'actual', {
        message: 'Mismatch'
      });
      
      expect(result.valid).toBe(false);
      expect(result.entity).toBe('entity1');
      expect(result.field).toBe('field1');
      expect(result.expected).toBe('expected');
      expect(result.actual).toBe('actual');
      expect(result.severity).toBe(ValidationSeverity.ERROR);
    });

    it('creates warning result', () => {
      const result = ValidationResult.warning('entity1', 'field1', 'Be careful');
      
      expect(result.valid).toBe(true);
      expect(result.severity).toBe(ValidationSeverity.WARNING);
      expect(result.message).toBe('Be careful');
    });

    it('creates critical result', () => {
      const result = ValidationResult.critical('entity1', 'field1', 'safety', 'violation', {
        message: 'CRITICAL: Invariant violated'
      });
      
      expect(result.valid).toBe(false);
      expect(result.severity).toBe(ValidationSeverity.CRITICAL);
    });
  });

  describe('markFixed', () => {
    it('marks result as fixed', () => {
      const result = ValidationResult.invalid('e1', 'f1', 'old', 'wrong');
      
      result.markFixed('correct');
      
      expect(result.fixApplied).toBe(true);
      expect(result.fixedValue).toBe('correct');
      expect(result.valid).toBe(true);
      expect(result.message).toContain('AUTO-FIXED');
    });

    it('returns this for chaining', () => {
      const result = new ValidationResult();
      const returned = result.markFixed('value');
      
      expect(returned).toBe(result);
    });
  });

  describe('toString', () => {
    it('formats valid result', () => {
      const result = ValidationResult.valid('entity1', 'field1', { message: 'OK' });
      const str = result.toString();
      
      expect(str).toContain('entity1');
      expect(str).toContain('field1');
      expect(str).toContain('OK');
    });

    it('formats invalid result with expected/actual', () => {
      const result = ValidationResult.invalid('e1', 'f1', 'expected', 'actual');
      const str = result.toString();
      
      expect(str).toContain('Expected');
      expect(str).toContain('actual');
    });

    it('formats fixed result', () => {
      const result = ValidationResult.invalid('e1', 'f1', 'old', 'wrong');
      result.markFixed('fixed');
      const str = result.toString();
      
      expect(str).toContain('Fixed');
    });
  });

  describe('toJSON', () => {
    it('serializes to plain object', () => {
      const result = ValidationResult.invalid('e1', 'f1', 'exp', 'act', {
        message: 'Test',
        details: { foo: 'bar' }
      });
      
      const json = result.toJSON();
      
      expect(json).toEqual({
        valid: false,
        type: 'unknown',
        layer: 'unknown',
        entity: 'e1',
        field: 'f1',
        message: 'Test',
        severity: ValidationSeverity.ERROR,
        expected: 'exp',
        actual: 'act',
        details: { foo: 'bar' },
        timestamp: expect.any(String),
        duration: 0,
        rule: null,
        fixable: false,
        fixApplied: false,
        fixedValue: undefined
      });
    });
  });
});

describe('ValidationReport', () => {
  let report;

  beforeEach(() => {
    report = new ValidationReport({ projectPath: '/test/project' });
  });

  describe('constructor', () => {
    it('creates empty report', () => {
      expect(report.projectPath).toBe('/test/project');
      expect(report.results).toEqual([]);
      expect(report.invariantViolations).toEqual([]);
      expect(report.stats.total).toBe(0);
    });

    it('initializes all layers', () => {
      expect(report.layers.source).toBeDefined();
      expect(report.layers.derivation).toBeDefined();
      expect(report.layers.semantic).toBeDefined();
      expect(report.layers.crossMetadata).toBeDefined();
    });
  });

  describe('addResult', () => {
    it('adds valid result and updates stats', () => {
      const result = ValidationResult.valid('e1', 'f1');
      
      report.addResult(result);
      
      expect(report.results).toHaveLength(1);
      expect(report.stats.total).toBe(1);
      expect(report.stats.passed).toBe(1);
    });

    it('adds warning result and updates stats', () => {
      const result = ValidationResult.warning('e1', 'f1', 'warn');
      
      report.addResult(result);
      
      expect(report.stats.warnings).toBe(1);
      expect(report.stats.passed).toBe(0);
    });

    it('adds invalid result and updates stats', () => {
      const result = ValidationResult.invalid('e1', 'f1', 'exp', 'act');
      
      report.addResult(result);
      
      expect(report.stats.failed).toBe(1);
    });

    it('adds critical result to invariantViolations', () => {
      const result = ValidationResult.critical('e1', 'f1', 'exp', 'act');
      
      report.addResult(result);
      
      expect(report.stats.critical).toBe(1);
      expect(report.invariantViolations).toHaveLength(1);
    });

    it('counts fixed results', () => {
      const result = ValidationResult.invalid('e1', 'f1', 'exp', 'act');
      result.markFixed('fixed');
      
      report.addResult(result);
      
      expect(report.stats.fixed).toBe(1);
    });

    it('adds result to correct layer', () => {
      const result = ValidationResult.valid('e1', 'f1');
      result.layer = 'derivation';
      
      report.addResult(result);
      
      expect(report.layers.derivation.results).toHaveLength(1);
      expect(report.layers.derivation.stats.passed).toBe(1);
    });

    it('returns this for chaining', () => {
      const result = ValidationResult.valid('e1', 'f1');
      const returned = report.addResult(result);
      
      expect(returned).toBe(report);
    });
  });

  describe('addResults', () => {
    it('adds multiple results', () => {
      const results = [
        ValidationResult.valid('e1', 'f1'),
        ValidationResult.invalid('e2', 'f2', 'exp', 'act'),
        ValidationResult.warning('e3', 'f3', 'warn')
      ];
      
      report.addResults(results);
      
      expect(report.stats.total).toBe(3);
      expect(report.stats.passed).toBe(1);
      expect(report.stats.failed).toBe(1);
      expect(report.stats.warnings).toBe(1);
    });
  });

  describe('markStale', () => {
    it('marks entity as stale', () => {
      report.markStale('entity1', 'file deleted');
      
      expect(report.staleEntities).toHaveLength(1);
      expect(report.staleEntities[0].entity).toBe('entity1');
      expect(report.staleEntities[0].reason).toBe('file deleted');
    });
  });

  describe('complete', () => {
    it('sets completion time and duration', () => {
      report.complete();
      
      expect(report.completedAt).toBeDefined();
      expect(report.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('allPassed', () => {
    it('returns true when no failures', () => {
      report.addResult(ValidationResult.valid('e1', 'f1'));
      
      expect(report.allPassed).toBe(true);
    });

    it('returns false when failures exist', () => {
      report.addResult(ValidationResult.invalid('e1', 'f1', 'exp', 'act'));
      
      expect(report.allPassed).toBe(false);
    });

    it('returns false when critical violations exist', () => {
      report.addResult(ValidationResult.critical('e1', 'f1', 'exp', 'act'));
      
      expect(report.allPassed).toBe(false);
    });
  });

  describe('hasCriticalViolations', () => {
    it('returns false when no critical', () => {
      report.addResult(ValidationResult.invalid('e1', 'f1', 'exp', 'act'));
      
      expect(report.hasCriticalViolations).toBe(false);
    });

    it('returns true when critical exists', () => {
      report.addResult(ValidationResult.critical('e1', 'f1', 'exp', 'act'));
      
      expect(report.hasCriticalViolations).toBe(true);
    });
  });

  describe('getResults', () => {
    beforeEach(() => {
      report.addResults([
        { ...ValidationResult.valid('e1', 'f1'), layer: 'source', severity: ValidationSeverity.INFO },
        { ...ValidationResult.invalid('e2', 'f2', 'exp', 'act'), layer: 'source', severity: ValidationSeverity.ERROR },
        { ...ValidationResult.valid('e3', 'f3'), layer: 'derivation', severity: ValidationSeverity.INFO }
      ]);
    });

    it('filters by layer', () => {
      const filtered = report.getResults({ layer: 'source' });
      
      expect(filtered).toHaveLength(2);
    });

    it('filters by severity', () => {
      const filtered = report.getResults({ severity: ValidationSeverity.ERROR });
      
      expect(filtered).toHaveLength(1);
    });

    it('filters by valid', () => {
      const filtered = report.getResults({ valid: false });
      
      expect(filtered).toHaveLength(1);
    });

    it('filters by entity', () => {
      const filtered = report.getResults({ entity: 'e1' });
      
      expect(filtered).toHaveLength(1);
    });
  });

  describe('toString', () => {
    it('formats report summary', () => {
      report.addResult(ValidationResult.valid('e1', 'f1'));
      report.addResult(ValidationResult.invalid('e2', 'f2', 'exp', 'act'));
      report.complete();
      
      const str = report.toString();
      
      expect(str).toContain('VALIDATION REPORT');
      expect(str).toContain('/test/project');
      expect(str).toContain('Passed');
      expect(str).toContain('Failed');
    });

    it('includes critical violations', () => {
      report.addResult(ValidationResult.critical('e1', 'f1', 'exp', 'act'));
      report.complete();
      
      const str = report.toString();
      
      expect(str).toContain('CRITICAL');
    });
  });

  describe('toJSON', () => {
    it('serializes complete report', () => {
      report.addResult(ValidationResult.valid('e1', 'f1'));
      report.complete();
      
      const json = report.toJSON();
      
      expect(json.projectPath).toBe('/test/project');
      expect(json.results).toHaveLength(1);
      expect(json.allPassed).toBe(true);
    });
  });
});

describe('ValidationSeverity', () => {
  it('has all severity levels', () => {
    expect(ValidationSeverity.INFO).toBe('info');
    expect(ValidationSeverity.WARNING).toBe('warning');
    expect(ValidationSeverity.ERROR).toBe('error');
    expect(ValidationSeverity.CRITICAL).toBe('critical');
  });
});

describe('ValidationType', () => {
  it('has all validation types', () => {
    expect(ValidationType.SOURCE).toBe('source');
    expect(ValidationType.DERIVATION).toBe('derivation');
    expect(ValidationType.SEMANTIC).toBe('semantic');
    expect(ValidationType.CROSS_METADATA).toBe('cross-metadata');
  });
});
