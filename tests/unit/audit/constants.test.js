/**
 * @fileoverview Audit Constants Tests
 */

import { describe, it, expect } from 'vitest';
import { REQUIRED_FIELDS, SCORE_THRESHOLDS } from '../../../src/audit/constants.js';

describe('REQUIRED_FIELDS', () => {
  describe('basic fields', () => {
    it('contains all required basic fields', () => {
      expect(REQUIRED_FIELDS.basic).toContain('id');
      expect(REQUIRED_FIELDS.basic).toContain('path');
      expect(REQUIRED_FIELDS.basic).toContain('name');
      expect(REQUIRED_FIELDS.basic).toContain('content');
      expect(REQUIRED_FIELDS.basic).toContain('exports');
      expect(REQUIRED_FIELDS.basic).toContain('imports');
      expect(REQUIRED_FIELDS.basic).toContain('dependencies');
      expect(REQUIRED_FIELDS.basic).toContain('dependents');
    });

    it('has 8 basic fields', () => {
      expect(REQUIRED_FIELDS.basic).toHaveLength(8);
    });
  });

  describe('metadata fields', () => {
    it('contains all required metadata fields', () => {
      expect(REQUIRED_FIELDS.metadata).toContain('exportCount');
      expect(REQUIRED_FIELDS.metadata).toContain('dependentCount');
      expect(REQUIRED_FIELDS.metadata).toContain('importCount');
      expect(REQUIRED_FIELDS.metadata).toContain('functionCount');
      expect(REQUIRED_FIELDS.metadata).toContain('hasJSDoc');
      expect(REQUIRED_FIELDS.metadata).toContain('hasAsync');
      expect(REQUIRED_FIELDS.metadata).toContain('hasErrors');
    });

    it('has 7 metadata fields', () => {
      expect(REQUIRED_FIELDS.metadata).toHaveLength(7);
    });
  });

  describe('llm fields', () => {
    it('contains all required llm fields', () => {
      expect(REQUIRED_FIELDS.llm).toContain('confidence');
      expect(REQUIRED_FIELDS.llm).toContain('reasoning');
      expect(REQUIRED_FIELDS.llm).toContain('analysisType');
    });

    it('has 3 llm fields', () => {
      expect(REQUIRED_FIELDS.llm).toHaveLength(3);
    });
  });

  describe('quality fields', () => {
    it('contains all required quality fields', () => {
      expect(REQUIRED_FIELDS.quality).toContain('qualityScore');
      expect(REQUIRED_FIELDS.quality).toContain('issues');
      expect(REQUIRED_FIELDS.quality).toContain('unusedExports');
      expect(REQUIRED_FIELDS.quality).toContain('isDeadCode');
    });

    it('has 4 quality fields', () => {
      expect(REQUIRED_FIELDS.quality).toHaveLength(4);
    });
  });

  describe('semantic fields', () => {
    it('contains all required semantic fields', () => {
      expect(REQUIRED_FIELDS.semantic).toContain('localStorageKeys');
      expect(REQUIRED_FIELDS.semantic).toContain('eventNames');
      expect(REQUIRED_FIELDS.semantic).toContain('sharedState');
      expect(REQUIRED_FIELDS.semantic).toContain('connections');
    });

    it('has 4 semantic fields', () => {
      expect(REQUIRED_FIELDS.semantic).toHaveLength(4);
    });
  });
});

describe('SCORE_THRESHOLDS', () => {
  it('defines EXCELLENT threshold', () => {
    expect(SCORE_THRESHOLDS.EXCELLENT).toBe(90);
  });

  it('defines GOOD threshold', () => {
    expect(SCORE_THRESHOLDS.GOOD).toBe(70);
  });

  it('defines ACCEPTABLE threshold', () => {
    expect(SCORE_THRESHOLDS.ACCEPTABLE).toBe(50);
  });

  it('defines POOR threshold', () => {
    expect(SCORE_THRESHOLDS.POOR).toBe(30);
  });

  it('has thresholds in descending order', () => {
    expect(SCORE_THRESHOLDS.EXCELLENT).toBeGreaterThan(SCORE_THRESHOLDS.GOOD);
    expect(SCORE_THRESHOLDS.GOOD).toBeGreaterThan(SCORE_THRESHOLDS.ACCEPTABLE);
    expect(SCORE_THRESHOLDS.ACCEPTABLE).toBeGreaterThan(SCORE_THRESHOLDS.POOR);
  });
});
