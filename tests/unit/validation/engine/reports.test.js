/**
 * @fileoverview Validation Reports Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReportBuilder, ReportFormatter } from '../../../../src/validation/validation-engine/reports/index.js';
import { ValidationResult, ValidationSeverity } from '../../../../src/validation/core/results/index.js';

describe('ReportBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new ReportBuilder({ projectPath: '/test' });
  });

  describe('constructor', () => {
    it('creates builder with options', () => {
      expect(builder.options.projectPath).toBe('/test');
    });

    it('initializes with reset', () => {
      expect(builder.report).toBeDefined();
    });
  });

  describe('reset', () => {
    it('creates new report', () => {
      builder.addResult(ValidationResult.valid('e1', 'f1'));
      
      builder.reset();
      
      expect(builder.report.stats.total).toBe(0);
    });

    it('returns builder for chaining', () => {
      const result = builder.reset();
      
      expect(result).toBe(builder);
    });
  });

  describe('addResult', () => {
    it('adds result to report', () => {
      const result = ValidationResult.valid('e1', 'f1');
      
      builder.addResult(result);
      
      expect(builder.report.stats.total).toBe(1);
    });

    it('returns builder for chaining', () => {
      const result = ValidationResult.valid('e1', 'f1');
      const returned = builder.addResult(result);
      
      expect(returned).toBe(builder);
    });
  });

  describe('addResults', () => {
    it('adds multiple results', () => {
      const results = [
        ValidationResult.valid('e1', 'f1'),
        ValidationResult.valid('e2', 'f2')
      ];
      
      builder.addResults(results);
      
      expect(builder.report.stats.total).toBe(2);
    });
  });

  describe('markStale', () => {
    it('marks entities as stale', () => {
      builder.markStale(['e1', 'e2'], 'file deleted');
      
      expect(builder.report.staleEntities).toHaveLength(2);
      expect(builder.report.staleEntities[0].reason).toBe('file deleted');
    });
  });

  describe('addError', () => {
    it('adds error as critical result', () => {
      const error = new Error('Test error');
      error.stack = 'test stack';
      
      builder.addError(error);
      
      expect(builder.report.stats.critical).toBe(1);
      expect(builder.report.hasCriticalViolations).toBe(true);
    });
  });

  describe('build', () => {
    it('completes and returns report', () => {
      builder.addResult(ValidationResult.valid('e1', 'f1'));
      
      const report = builder.build();
      
      expect(report.completedAt).toBeDefined();
      expect(report.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('hasCriticalViolations', () => {
    it('returns true when critical exists', () => {
      builder.addResult(ValidationResult.critical('e1', 'f1', 'exp', 'act'));
      
      expect(builder.hasCriticalViolations()).toBe(true);
    });

    it('returns false when no critical', () => {
      builder.addResult(ValidationResult.valid('e1', 'f1'));
      
      expect(builder.hasCriticalViolations()).toBe(false);
    });
  });
});

describe('ReportFormatter', () => {
  describe('format', () => {
    it('formats report as string', async () => {
      const { ValidationReport } = await import('../../../../src/validation/core/results/index.js');
      const report = new ValidationReport({ projectPath: '/test' });
      report.stats.total = 5;
      report.stats.passed = 3;
      report.stats.warnings = 1;
      report.stats.failed = 1;
      report.duration = 100;
      report.complete();
      
      const formatted = ReportFormatter.format(report);
      
      expect(formatted).toContain('/test');
    });

    it('formats as JSON', async () => {
      const { ValidationReport } = await import('../../../../src/validation/core/results/index.js');
      const report = new ValidationReport({ projectPath: '/test' });
      report.complete();
      
      const formatted = ReportFormatter.format(report, 'json');
      const parsed = JSON.parse(formatted);
      
      expect(parsed.projectPath).toBe('/test');
    });

    it('formats as markdown', async () => {
      const { ValidationReport } = await import('../../../../src/validation/core/results/index.js');
      const report = new ValidationReport({ projectPath: '/test/project' });
      report.complete();
      
      const formatted = ReportFormatter.format(report, 'markdown');
      
      expect(formatted).toContain('# Validation Report');
      expect(formatted).toContain('/test/project');
    });
  });
});
