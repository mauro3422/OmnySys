/**
 * @fileoverview timeout-calculator.test.js
 * 
 * Tests para cálculo de timeouts dinámicos
 * 
 * @module tests/unit/layer-b-semantic/validators/utils/timeout-calculator
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDynamicTimeout,
  calculateBatchTimeout
} from '#layer-b/validators/utils/timeout-calculator.js';
import { TimeoutConfigBuilder } from '../../../../factories/layer-b-validators/builders.js';
import { TIMEOUT_CONFIG } from '#layer-b/validators/constants.js';

describe('validators/utils/timeout-calculator', () => {
  describe('calculateDynamicTimeout', () => {
    it('should return base timeout for empty code', () => {
      const timeout = calculateDynamicTimeout('');
      expect(timeout).toBe(TIMEOUT_CONFIG.baseTimeout);
    });

    it('should return base timeout for small code (< 500 chars)', () => {
      const { code } = new TimeoutConfigBuilder()
        .withCodeLength(0)
        .build();
      
      const timeout = calculateDynamicTimeout(code);
      expect(timeout).toBe(TIMEOUT_CONFIG.baseTimeout);
    });

    it('should add 1 second for each 500 chars', () => {
      const { code } = new TimeoutConfigBuilder()
        .withCodeLength(500)
        .build();
      
      const timeout = calculateDynamicTimeout(code);
      expect(timeout).toBe(TIMEOUT_CONFIG.baseTimeout + 1000);
    });

    it('should add 2 seconds for 1000 chars', () => {
      const { code } = new TimeoutConfigBuilder()
        .withCodeLength(1000)
        .build();
      
      const timeout = calculateDynamicTimeout(code);
      expect(timeout).toBe(TIMEOUT_CONFIG.baseTimeout + 2000);
    });

    it('should calculate correctly for medium file (2500 chars)', () => {
      const { code } = new TimeoutConfigBuilder()
        .asMediumFile()
        .build();
      
      const timeout = calculateDynamicTimeout(code);
      expect(timeout).toBe(TIMEOUT_CONFIG.baseTimeout + 5000);
    });

    it('should cap at max timeout', () => {
      const { code } = new TimeoutConfigBuilder()
        .asHugeFile()
        .build();
      
      const timeout = calculateDynamicTimeout(code);
      expect(timeout).toBe(TIMEOUT_CONFIG.maxTimeout);
    });

    it('should not exceed max timeout', () => {
      const hugeCode = 'x'.repeat(1000000);
      const timeout = calculateDynamicTimeout(hugeCode);
      expect(timeout).toBeLessThanOrEqual(TIMEOUT_CONFIG.maxTimeout);
    });
  });

  describe('calculateBatchTimeout', () => {
    it('should return base timeout for empty array', () => {
      expect(calculateBatchTimeout([])).toBe(TIMEOUT_CONFIG.baseTimeout);
    });

    it('should return base timeout for null', () => {
      expect(calculateBatchTimeout(null)).toBe(TIMEOUT_CONFIG.baseTimeout);
    });

    it('should return base timeout for undefined', () => {
      expect(calculateBatchTimeout(undefined)).toBe(TIMEOUT_CONFIG.baseTimeout);
    });

    it('should calculate for single code string', () => {
      const codes = ['x'.repeat(1000)];
      const timeout = calculateBatchTimeout(codes);
      expect(timeout).toBe(TIMEOUT_CONFIG.baseTimeout + 2000);
    });

    it('should calculate for multiple code strings', () => {
      const codes = [
        'x'.repeat(500),
        'x'.repeat(500),
        'x'.repeat(500)
      ];
      const timeout = calculateBatchTimeout(codes);
      // 1500 total chars = 3 factors = 3000ms additional
      expect(timeout).toBe(TIMEOUT_CONFIG.baseTimeout + 3000);
    });

    it('should handle empty strings in array', () => {
      const codes = ['', 'x'.repeat(500), ''];
      const timeout = calculateBatchTimeout(codes);
      expect(timeout).toBe(TIMEOUT_CONFIG.baseTimeout + 1000);
    });

    it('should handle null/undefined in array', () => {
      const codes = ['x'.repeat(500), null, undefined, 'x'.repeat(500)];
      const timeout = calculateBatchTimeout(codes);
      expect(timeout).toBe(TIMEOUT_CONFIG.baseTimeout + 2000);
    });

    it('should cap at max timeout for large batches', () => {
      const codes = Array(10).fill('x'.repeat(10000));
      const timeout = calculateBatchTimeout(codes);
      expect(timeout).toBe(TIMEOUT_CONFIG.maxTimeout);
    });
  });
});
