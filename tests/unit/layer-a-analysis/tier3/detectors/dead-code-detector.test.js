import { describe, it, expect } from 'vitest';
import { DeadCodeDetector } from '../../../../../src/layer-a-static/analyses/tier3/detectors/DeadCodeDetector.js';
import { DetectorTestFactory, DetectorScenarios } from '../../../../factories/detector-test.factory.js';

describe('Tier 3 - DeadCodeDetector', () => {
  describe('Structure Contract', () => {
    it('should return object with total, byFile, and all properties', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorScenarios.empty();
      
      const result = detector.detect(systemMap);
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byFile');
      expect(result).toHaveProperty('all');
    });

    it('should return numeric total', () => {
      const detector = new DeadCodeDetector();
      const result = detector.detect({});
      
      expect(typeof result.total).toBe('number');
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should return array for all', () => {
      const detector = new DeadCodeDetector();
      const result = detector.detect({});
      
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should NOT throw on null/undefined input', () => {
      const detector = new DeadCodeDetector();
      
      expect(() => detector.detect(null)).not.toThrow();
      expect(() => detector.detect(undefined)).not.toThrow();
      expect(() => detector.detect({})).not.toThrow();
    });
  });

  describe('Dead Code Detection', () => {
    it('should detect function never called', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorScenarios.deadCode();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.all[0].functionName).toBe('unusedHelper');
    });

    it('should not detect exported functions', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorScenarios.deadCode();
      
      const result = detector.detect(systemMap);
      
      const exportedFunc = result.all.find(i => i.functionName === 'usedHelper');
      expect(exportedFunc).toBeUndefined();
    });

    it('should not detect called functions', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorTestFactory.createMixedFunctionTypes();
      
      const result = detector.detect(systemMap);
      
      const calledFunc = result.all.find(i => i.functionName === 'helper');
      expect(calledFunc).toBeUndefined();
    });

    it('should detect multiple dead functions in same file', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorTestFactory.createDeadFunctions(3);
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(3);
      expect(result.all).toHaveLength(3);
    });
  });

  describe('Exclusions', () => {
    it('should not detect event handlers (on*)', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorScenarios.deadCodeWithHandlers();
      
      const result = detector.detect(systemMap);
      
      const eventHandler = result.all.find(i => i.functionName === 'onClick');
      expect(eventHandler).toBeUndefined();
    });

    it('should not detect event handlers (handle*)', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorScenarios.deadCodeWithHandlers();
      
      const result = detector.detect(systemMap);
      
      const eventHandler = result.all.find(i => i.functionName === 'handleSubmit');
      expect(eventHandler).toBeUndefined();
    });

    it('should not detect init functions', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorScenarios.deadCodeWithHandlers();
      
      const result = detector.detect(systemMap);
      
      const initFunc = result.all.find(i => i.functionName === 'initApp');
      expect(initFunc).toBeUndefined();
    });

    it('should correctly identify mixed function types', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorTestFactory.createMixedFunctionTypes();
      
      const result = detector.detect(systemMap);
      
      // Should only flag unused1 and unused2 as dead
      expect(result.total).toBe(2);
      expect(result.all.every(i => ['unused1', 'unused2'].includes(i.functionName))).toBe(true);
    });
  });

  describe('Issue Format', () => {
    it('should include all required fields in issues', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorScenarios.deadCode();
      
      const result = detector.detect(systemMap);
      
      const issue = result.all[0];
      expect(issue).toHaveProperty('functionName');
      expect(issue).toHaveProperty('file');
      expect(issue).toHaveProperty('line');
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('reason');
      expect(issue).toHaveProperty('suggestion');
    });

    it('should have correct type for dead functions', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorScenarios.deadCode();
      
      const result = detector.detect(systemMap);
      
      expect(result.all[0].type).toBe('DEAD_FUNCTION');
    });

    it('should have LOW severity', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorScenarios.deadCode();
      
      const result = detector.detect(systemMap);
      
      expect(result.all[0].severity).toBe('LOW');
    });

    it('should group issues by file', () => {
      const detector = new DeadCodeDetector();
      const systemMap = DetectorTestFactory.createDeadFunctions(2);
      
      const result = detector.detect(systemMap);
      
      expect(Object.keys(result.byFile)).toContain('src/utils.js');
      expect(result.byFile['src/utils.js']).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty system map', () => {
      const detector = new DeadCodeDetector();
      const result = detector.detect({ files: {}, functions: {} });
      
      expect(result.total).toBe(0);
      expect(result.all).toEqual([]);
    });

    it('should handle missing functions property', () => {
      const detector = new DeadCodeDetector();
      const result = detector.detect({ files: { 'test.js': {} } });
      
      expect(result.total).toBe(0);
    });

    it('should handle null functions arrays', () => {
      const detector = new DeadCodeDetector();
      const result = detector.detect({ functions: { 'test.js': null } });
      
      expect(result.total).toBe(0);
    });

    it('should handle function without name', () => {
      const detector = new DeadCodeDetector();
      const systemMap = {
        functions: {
          'test.js': [{ line: 1, isExported: false }]
        }
      };
      
      const result = detector.detect(systemMap);
      
      // Should handle gracefully without throwing
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });
});
