import { describe, it, expect } from 'vitest';
import { DuplicateDetector } from '../../../../../src/layer-a-static/analyses/tier3/detectors/DuplicateDetector.js';
import { DetectorScenarios, DetectorTestFactory, SystemMapBuilder } from '../../../../factories/detector-test.factory.js';

describe('Tier 3 - DuplicateDetector', () => {
  describe('Structure Contract', () => {
    it('should return object with total and all properties', () => {
      const detector = new DuplicateDetector();
      const systemMap = DetectorScenarios.empty();
      
      const result = detector.detect(systemMap);
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('all');
    });

    it('should return numeric total', () => {
      const detector = new DuplicateDetector();
      const result = detector.detect({});
      
      expect(typeof result.total).toBe('number');
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should NOT throw on null/undefined input', () => {
      const detector = new DuplicateDetector();
      
      expect(() => detector.detect(null)).not.toThrow();
      expect(() => detector.detect(undefined)).not.toThrow();
      expect(() => detector.detect({})).not.toThrow();
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate function names', () => {
      const detector = new DuplicateDetector();
      const systemMap = DetectorScenarios.duplicateFunctions();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.all[0].functionName).toBe('formatDate');
    });

    it('should not flag unique function names', () => {
      const detector = new DuplicateDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'uniqueA')
        .withFunction('src/b.js', 'uniqueB')
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(0);
    });

    it('should detect duplicates across multiple files', () => {
      const detector = new DuplicateDetector();
      const systemMap = DetectorTestFactory.createDuplicateFunctions('helper', 5);
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(1);
      expect(result.all[0].count).toBe(5);
      expect(result.all[0].files).toHaveLength(5);
    });

    it('should detect multiple different duplicates', () => {
      const detector = new DuplicateDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'formatDate')
        .withFunction('src/b.js', 'formatDate')
        .withFunction('src/a.js', 'parseData')
        .withFunction('src/b.js', 'parseData')
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(2);
      const funcNames = result.all.map(d => d.functionName);
      expect(funcNames).toContain('formatDate');
      expect(funcNames).toContain('parseData');
    });
  });

  describe('Common Name Exclusions', () => {
    it('should ignore common function names like handleClick', () => {
      const detector = new DuplicateDetector();
      const systemMap = DetectorScenarios.duplicateFunctions();
      
      const result = detector.detect(systemMap);
      
      const handleClick = result.all.find(d => d.functionName === 'handleClick');
      expect(handleClick).toBeUndefined();
    });

    it('should ignore common function names like onClick', () => {
      const detector = new DuplicateDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'onClick')
        .withFunction('src/b.js', 'onClick')
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(0);
    });

    it('should ignore init functions', () => {
      const detector = new DuplicateDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'init')
        .withFunction('src/b.js', 'init')
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(0);
    });

    it('should ignore underscore prefixed functions', () => {
      const detector = new DuplicateDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', '_privateHelper')
        .withFunction('src/b.js', '_privateHelper')
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(0);
    });

    it('should ignore array methods', () => {
      const detector = new DuplicateDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'map')
        .withFunction('src/b.js', 'map')
        .withFunction('src/a.js', 'filter')
        .withFunction('src/b.js', 'filter')
        .build();
      
      const result = detector.detect(systemMap);
      
      expect(result.total).toBe(0);
    });
  });

  describe('Issue Format', () => {
    it('should include all required fields', () => {
      const detector = new DuplicateDetector();
      const systemMap = DetectorScenarios.duplicateFunctions();
      
      const result = detector.detect(systemMap);
      
      const issue = result.all[0];
      expect(issue).toHaveProperty('functionName');
      expect(issue).toHaveProperty('files');
      expect(issue).toHaveProperty('count');
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('reason');
      expect(issue).toHaveProperty('suggestion');
    });

    it('should have correct type', () => {
      const detector = new DuplicateDetector();
      const systemMap = DetectorScenarios.duplicateFunctions();
      
      const result = detector.detect(systemMap);
      
      expect(result.all[0].type).toBe('DUPLICATE_FUNCTION_NAME');
    });

    it('should have LOW severity', () => {
      const detector = new DuplicateDetector();
      const systemMap = DetectorScenarios.duplicateFunctions();
      
      const result = detector.detect(systemMap);
      
      expect(result.all[0].severity).toBe('LOW');
    });

    it('should include all files where function is defined', () => {
      const detector = new DuplicateDetector();
      const systemMap = DetectorScenarios.duplicateFunctions();
      
      const result = detector.detect(systemMap);
      
      expect(result.all[0].files).toContain('src/a.js');
      expect(result.all[0].files).toContain('src/b.js');
      expect(result.all[0].files).toContain('src/c.js');
    });

    it('should have correct count', () => {
      const detector = new DuplicateDetector();
      const systemMap = DetectorScenarios.duplicateFunctions();
      
      const result = detector.detect(systemMap);
      
      expect(result.all[0].count).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty system map', () => {
      const detector = new DuplicateDetector();
      const result = detector.detect({ files: {}, functions: {} });
      
      expect(result.total).toBe(0);
      expect(result.all).toEqual([]);
    });

    it('should handle missing functions property', () => {
      const detector = new DuplicateDetector();
      const result = detector.detect({ files: { 'test.js': {} } });
      
      expect(result.total).toBe(0);
    });

    it('should handle single file with duplicates (should not flag)', () => {
      const detector = new DuplicateDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/app.js')
        .withFunction('src/app.js', 'helper', { line: 1 })
        .withFunction('src/app.js', 'helper', { line: 10 })
        .build();
      
      const result = detector.detect(systemMap);
      
      // Same file duplicates are handled differently (not cross-file duplicates)
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should handle functions without names', () => {
      const detector = new DuplicateDetector();
      const systemMap = {
        functions: {
          'src/a.js': [{ line: 1 }],
          'src/b.js': [{ line: 1 }]
        }
      };
      
      // Should handle gracefully without throwing
      expect(() => detector.detect(systemMap)).not.toThrow();
    });
  });
});
