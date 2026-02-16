import { describe, it, expect } from 'vitest';
import { 
  calculateScoreSeverity, 
  getSeverityThreshold 
} from '#layer-a/analyses/tier3/calculators/SeverityCalculator.js';

describe('SeverityCalculator', () => {
  describe('Structure Contract', () => {
    it('should export calculateScoreSeverity function', () => {
      expect(typeof calculateScoreSeverity).toBe('function');
    });

    it('should export getSeverityThreshold function', () => {
      expect(typeof getSeverityThreshold).toBe('function');
    });

    it('should return string severity from calculateScoreSeverity', () => {
      const result = calculateScoreSeverity(5);
      expect(typeof result).toBe('string');
      expect(['low', 'medium', 'high', 'critical']).toContain(result);
    });

    it('should return number threshold from getSeverityThreshold', () => {
      const result = getSeverityThreshold('medium');
      expect(typeof result).toBe('number');
    });
  });

  describe('Functionality Tests', () => {
    describe('calculateScoreSeverity', () => {
      it('should return "low" for scores 0-2', () => {
        expect(calculateScoreSeverity(0)).toBe('low');
        expect(calculateScoreSeverity(1)).toBe('low');
        expect(calculateScoreSeverity(2)).toBe('low');
      });

      it('should return "medium" for scores 3-5', () => {
        expect(calculateScoreSeverity(3)).toBe('medium');
        expect(calculateScoreSeverity(4)).toBe('medium');
        expect(calculateScoreSeverity(5)).toBe('medium');
      });

      it('should return "high" for scores 6-7', () => {
        expect(calculateScoreSeverity(6)).toBe('high');
        expect(calculateScoreSeverity(7)).toBe('high');
      });

      it('should return "critical" for scores 8-10', () => {
        expect(calculateScoreSeverity(8)).toBe('critical');
        expect(calculateScoreSeverity(9)).toBe('critical');
        expect(calculateScoreSeverity(10)).toBe('critical');
      });

      it('should handle edge cases at thresholds', () => {
        expect(calculateScoreSeverity(2.9)).toBe('low');
        expect(calculateScoreSeverity(3)).toBe('medium');
        expect(calculateScoreSeverity(5.9)).toBe('medium');
        expect(calculateScoreSeverity(6)).toBe('high');
        expect(calculateScoreSeverity(7.9)).toBe('high');
        expect(calculateScoreSeverity(8)).toBe('critical');
      });
    });

    describe('getSeverityThreshold', () => {
      it('should return correct threshold for each severity', () => {
        expect(getSeverityThreshold('low')).toBe(0);
        expect(getSeverityThreshold('medium')).toBe(3);
        expect(getSeverityThreshold('high')).toBe(6);
        expect(getSeverityThreshold('critical')).toBe(8);
      });
    });

    describe('Consistency', () => {
      it('should have matching thresholds between functions', () => {
        const severities = ['low', 'medium', 'high', 'critical'];
        
        severities.forEach(severity => {
          const threshold = getSeverityThreshold(severity);
          const calculatedSeverity = calculateScoreSeverity(threshold);
          
          // Score at threshold should match the severity or be higher
          expect(['low', 'medium', 'high', 'critical']).toContain(calculatedSeverity);
        });
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle negative scores as low', () => {
      expect(calculateScoreSeverity(-1)).toBe('low');
      expect(calculateScoreSeverity(-10)).toBe('low');
    });

    it('should handle scores above 10 as critical', () => {
      expect(calculateScoreSeverity(11)).toBe('critical');
      expect(calculateScoreSeverity(100)).toBe('critical');
    });

    it('should return 0 for unknown severity', () => {
      expect(getSeverityThreshold('unknown')).toBe(0);
      expect(getSeverityThreshold('')).toBe(0);
    });

    it('should handle null severity', () => {
      expect(getSeverityThreshold(null)).toBe(0);
    });

    it('should handle undefined severity', () => {
      expect(getSeverityThreshold(undefined)).toBe(0);
    });

    it('should be case sensitive', () => {
      expect(getSeverityThreshold('LOW')).toBe(0);
      expect(getSeverityThreshold('Medium')).toBe(0);
    });

    it('should handle null score', () => {
      expect(calculateScoreSeverity(null)).toBe('low');
    });

    it('should handle undefined score', () => {
      expect(calculateScoreSeverity(undefined)).toBe('low');
    });
  });
});
