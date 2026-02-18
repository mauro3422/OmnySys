import { describe, it, expect } from 'vitest';
import { CB_STATE, default as CB_STATE_DEFAULT } from '#services/llm-service/constants.js';

describe('llm-service/constants.js', () => {
  describe('CB_STATE', () => {
    it('should have CLOSED state', () => {
      expect(CB_STATE.CLOSED).toBe('CLOSED');
    });

    it('should have OPEN state', () => {
      expect(CB_STATE.OPEN).toBe('OPEN');
    });

    it('should have HALF_OPEN state', () => {
      expect(CB_STATE.HALF_OPEN).toBe('HALF_OPEN');
    });

    it('should have exactly 3 states', () => {
      const keys = Object.keys(CB_STATE);
      expect(keys).toHaveLength(3);
    });

    it('BUG: CB_STATE is not frozen (should be immutable)', () => {
      expect(() => {
        CB_STATE.NEW_STATE = 'NEW';
      }).not.toThrow();
      delete CB_STATE.NEW_STATE;
    });

    it('default export should be CB_STATE', () => {
      expect(CB_STATE_DEFAULT).toBe(CB_STATE);
    });
  });

  describe('state values', () => {
    it('should have unique values for each state', () => {
      const values = Object.values(CB_STATE);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have string values', () => {
      Object.values(CB_STATE).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });
  });
});
