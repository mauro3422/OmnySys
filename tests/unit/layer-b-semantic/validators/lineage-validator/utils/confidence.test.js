/**
 * @fileoverview confidence.test.js
 * 
 * Tests para calculador de confianza
 * 
 * @module tests/unit/layer-b-semantic/validators/lineage-validator/utils/confidence
 */

import { describe, it, expect } from 'vitest';
import { calculateConfidence } from '#layer-b/validators/lineage-validator/utils/confidence.js';
import { AtomBuilder } from '../../../../../factories/layer-b-lineage/builders.js';

describe('validators/lineage-validator/utils/confidence', () => {
  describe('calculateConfidence', () => {
    it('should return high for perfect atom', () => {
      const atom = new AtomBuilder().build();
      
      const result = calculateConfidence(atom, [], []);
      
      expect(result).toBe('high');
    });

    it('should return high for atom with DNA and semantic', () => {
      const atom = new AtomBuilder().build();
      
      const result = calculateConfidence(atom, [], []);
      
      // Base 100 + 10 (dna) + 10 (semantic) = 120
      expect(result).toBe('high');
    });

    it('should penalize errors', () => {
      const atom = new AtomBuilder().build();
      const errors = ['error1', 'error2'];
      
      const result = calculateConfidence(atom, errors, []);
      
      // 100 + 20 (bonuses) - 60 (2 errors * 30) = 60 -> medium
      expect(result).toBe('medium');
    });

    it('should penalize warnings', () => {
      const atom = new AtomBuilder().build();
      const warnings = ['warning1', 'warning2', 'warning3'];
      
      const result = calculateConfidence(atom, [], warnings);
      
      // 100 + 20 (bonuses) - 30 (3 warnings * 10) = 90 -> high
      expect(result).toBe('high');
    });

    it('should return medium when score between 50 and 79', () => {
      const atom = {}; // No bonuses
      const errors = ['error1']; // -30
      const warnings = ['warning1', 'warning2']; // -20
      
      const result = calculateConfidence(atom, errors, warnings);
      
      // 100 - 30 - 20 = 50 -> medium
      expect(result).toBe('medium');
    });

    it('should return low when score below 50', () => {
      const atom = {};
      const errors = ['error1', 'error2']; // -60
      
      const result = calculateConfidence(atom, errors, []);
      
      // 100 - 60 = 40 -> low
      expect(result).toBe('low');
    });

    it('should give bonus for standardized atom', () => {
      const atom = new AtomBuilder().build();
      atom.standardized = true;
      
      const result = calculateConfidence(atom, [], []);
      
      // 100 + 10 (dna) + 10 (semantic) + 10 (standardized) = 130
      expect(result).toBe('high');
    });

    it('should handle atom without DNA or semantic', () => {
      const atom = {};
      
      const result = calculateConfidence(atom, [], []);
      
      // 100 + 0 bonuses = 100
      expect(result).toBe('high');
    });

    it('should return low for many errors', () => {
      const atom = {};
      const errors = Array(5).fill('error');
      
      const result = calculateConfidence(atom, errors, []);
      
      // 100 - 150 = -50 -> low
      expect(result).toBe('low');
    });

    it('should handle boundary at 80', () => {
      const atom = {};
      // Need score of exactly 80
      const errors = []; // 0
      const warnings = ['w1', 'w2']; // -20
      // 100 - 20 = 80 -> high
      
      const result = calculateConfidence(atom, errors, warnings);
      expect(result).toBe('high');
    });

    it('should handle boundary at 50', () => {
      const atom = {};
      // Need score of exactly 50
      const errors = ['e1']; // -30
      const warnings = ['w1', 'w2']; // -20
      // 100 - 30 - 20 = 50 -> medium
      
      const result = calculateConfidence(atom, errors, warnings);
      expect(result).toBe('medium');
    });
  });
});
