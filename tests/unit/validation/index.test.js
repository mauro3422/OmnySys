/**
 * @fileoverview Validation System Index Tests
 */

import { describe, it, expect } from 'vitest';
import * as validation from '../../../src/validation/index.js';

describe('Validation Module Index', () => {
  describe('exports', () => {
    it('exports ValidationResult', () => {
      expect(validation.ValidationResult).toBeDefined();
    });

    it('exports ValidationReport', () => {
      expect(validation.ValidationReport).toBeDefined();
    });

    it('exports ValidationSeverity', () => {
      expect(validation.ValidationSeverity).toBeDefined();
    });

    it('exports ValidationType', () => {
      expect(validation.ValidationType).toBeDefined();
    });

    it('exports createReport', () => {
      expect(validation.createReport).toBeDefined();
      expect(typeof validation.createReport).toBe('function');
    });

    it('exports RuleRegistry', () => {
      expect(validation.RuleRegistry).toBeDefined();
    });

    it('exports ValidationRule', () => {
      expect(validation.ValidationRule).toBeDefined();
    });

    it('exports getGlobalRegistry', () => {
      expect(validation.getGlobalRegistry).toBeDefined();
      expect(typeof validation.getGlobalRegistry).toBe('function');
    });

    it('exports createRule', () => {
      expect(validation.createRule).toBeDefined();
      expect(typeof validation.createRule).toBe('function');
    });

    it('exports ValidationEngine', () => {
      expect(validation.ValidationEngine).toBeDefined();
    });

    it('exports ValidationContext', () => {
      expect(validation.ValidationContext).toBeDefined();
    });

    it('exports validate function', () => {
      expect(validation.validate).toBeDefined();
      expect(typeof validation.validate).toBe('function');
    });
  });

  describe('source rules exports', () => {
    it('exports FileExistenceRule', () => {
      expect(validation.FileExistenceRule).toBeDefined();
    });

    it('exports ExportConsistencyRule', () => {
      expect(validation.ExportConsistencyRule).toBeDefined();
    });

    it('exports ImportResolutionRule', () => {
      expect(validation.ImportResolutionRule).toBeDefined();
    });

    it('exports SourceRules', () => {
      expect(validation.SourceRules).toBeDefined();
      expect(Array.isArray(validation.SourceRules)).toBe(true);
    });

    it('exports registerSourceRules', () => {
      expect(validation.registerSourceRules).toBeDefined();
      expect(typeof validation.registerSourceRules).toBe('function');
    });
  });

  describe('derivation rules exports', () => {
    it('exports ComplexityCalculationRule', () => {
      expect(validation.ComplexityCalculationRule).toBeDefined();
    });
  });

  describe('invariants exports', () => {
    it('exports SystemInvariants', () => {
      expect(validation.SystemInvariants).toBeDefined();
      expect(Array.isArray(validation.SystemInvariants)).toBe(true);
    });

    it('exports registerInvariants', () => {
      expect(validation.registerInvariants).toBeDefined();
      expect(typeof validation.registerInvariants).toBe('function');
    });

    it('exports UniqueIdsInvariant', () => {
      expect(validation.UniqueIdsInvariant).toBeDefined();
    });

    it('exports ValidReferencesInvariant', () => {
      expect(validation.ValidReferencesInvariant).toBeDefined();
    });

    it('exports BidirectionalGraphInvariant', () => {
      expect(validation.BidirectionalGraphInvariant).toBeDefined();
    });
  });

  describe('constants', () => {
    it('exports VERSION', () => {
      expect(validation.VERSION).toBe('1.0.0');
    });

    it('exports LAYERS', () => {
      expect(validation.LAYERS).toBeDefined();
      expect(validation.LAYERS.source).toBeDefined();
      expect(validation.LAYERS.derivation).toBeDefined();
      expect(validation.LAYERS.semantic).toBeDefined();
      expect(validation.LAYERS['cross-metadata']).toBeDefined();
    });

    it('LAYERS have correct structure', () => {
      expect(validation.LAYERS.source.name).toBe('Source Validation');
      expect(validation.LAYERS.source.description).toBeDefined();
      expect(Array.isArray(validation.LAYERS.source.examples)).toBe(true);
    });
  });
});
