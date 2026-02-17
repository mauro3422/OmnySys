/**
 * @fileoverview risk-score.test.js
 * 
 * Tests para validación de risk scores
 * 
 * @module tests/unit/layer-b-semantic/schema-validator/validators/risk-score
 */

import { describe, it, expect } from 'vitest';
import { validateRiskScore } from '#layer-b/schema-validator/validators/risk-score.js';

describe('schema-validator/validators/risk-score', () => {
  describe('validateRiskScore', () => {
    it('should validate valid risk score', () => {
      const riskScore = {
        total: 5
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require total field', () => {
      const riskScore = {};
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: total');
    });

    it('should validate total is number', () => {
      const riskScore = {
        total: 'high'
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid total type'))).toBe(true);
    });

    it('should validate total is within range 0-10', () => {
      const riskScore = {
        total: 15
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid total value'))).toBe(true);
    });

    it('should accept total of 0', () => {
      const riskScore = {
        total: 0
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(true);
    });

    it('should accept total of 10', () => {
      const riskScore = {
        total: 10
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(true);
    });

    it('should accept valid breakdown keys', () => {
      const riskScore = {
        total: 5,
        breakdown: {
          staticComplexity: 3,
          semanticConnections: 2,
          hotspotRisk: 1,
          sideEffectRisk: 2
        }
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid breakdown keys', () => {
      const riskScore = {
        total: 5,
        breakdown: {
          invalidKey: 3
        }
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid breakdown key'))).toBe(true);
    });

    it('should validate breakdown values are numbers', () => {
      const riskScore = {
        total: 5,
        breakdown: {
          staticComplexity: 'high'
        }
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid breakdown value'))).toBe(true);
    });

    it('should validate breakdown values are within range 0-10', () => {
      const riskScore = {
        total: 5,
        breakdown: {
          staticComplexity: 15
        }
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid breakdown value'))).toBe(true);
    });

    it('should accept breakdown value of 0', () => {
      const riskScore = {
        total: 5,
        breakdown: {
          staticComplexity: 0
        }
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(true);
    });

    it('should accept breakdown value of 10', () => {
      const riskScore = {
        total: 5,
        breakdown: {
          staticComplexity: 10
        }
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(true);
    });

    it('should handle multiple breakdown errors', () => {
      const riskScore = {
        total: 5,
        breakdown: {
          invalidKey: 'not a number',
          staticComplexity: 15
        }
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should handle negative total', () => {
      const riskScore = {
        total: -1
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid total value'))).toBe(true);
    });

    it('should handle negative breakdown values', () => {
      const riskScore = {
        total: 5,
        breakdown: {
          staticComplexity: -5
        }
      };
      
      const result = validateRiskScore(riskScore);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid breakdown value'))).toBe(true);
    });
  });
});
