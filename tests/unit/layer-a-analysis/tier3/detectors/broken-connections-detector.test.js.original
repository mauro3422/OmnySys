import { describe, it, expect } from 'vitest';
import { BrokenConnectionsDetector } from '../../../../../src/layer-a-static/analyses/tier3/detectors/BrokenConnectionsDetector.js';
import { DetectorScenarios, SystemMapBuilder, AdvancedAnalysisBuilder } from '../../../../factories/detector-test.factory.js';

describe('Tier 3 - BrokenConnectionsDetector', () => {
  describe('Construction', () => {
    it('should create detector instance', () => {
      const detector = new BrokenConnectionsDetector();
      expect(detector).toBeInstanceOf(BrokenConnectionsDetector);
    });

    it('should initialize with all sub-detectors', () => {
      const detector = new BrokenConnectionsDetector();
      
      expect(detector.workerDetector).toBeDefined();
      expect(detector.importDetector).toBeDefined();
      expect(detector.duplicateDetector).toBeDefined();
      expect(detector.deadCodeDetector).toBeDefined();
      expect(detector.urlValidator).toBeDefined();
    });
  });

  describe('Structure Contract', () => {
    it('should return object with summary and all issue categories', () => {
      const detector = new BrokenConnectionsDetector();
      const result = detector.analyze({}, {});
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('brokenWorkers');
      expect(result).toHaveProperty('brokenDynamicImports');
      expect(result).toHaveProperty('duplicateFunctions');
      expect(result).toHaveProperty('deadFunctions');
      expect(result).toHaveProperty('suspiciousUrls');
      expect(result).toHaveProperty('all');
    });

    it('should have correct summary structure', () => {
      const detector = new BrokenConnectionsDetector();
      const result = detector.analyze({}, {});
      
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('critical');
      expect(result.summary).toHaveProperty('warning');
      expect(result.summary).toHaveProperty('info');
    });

    it('should return numeric totals', () => {
      const detector = new BrokenConnectionsDetector();
      const result = detector.analyze({}, {});
      
      expect(typeof result.summary.total).toBe('number');
      expect(typeof result.summary.critical).toBe('number');
      expect(typeof result.summary.warning).toBe('number');
      expect(typeof result.summary.info).toBe('number');
    });

    it('should NOT throw on null/undefined input', () => {
      const detector = new BrokenConnectionsDetector();
      
      expect(() => detector.analyze(null, null)).not.toThrow();
      expect(() => detector.analyze({}, {})).not.toThrow();
    });
  });

  describe('Integration - All Detectors', () => {
    it('should detect dead functions', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/utils.js')
        .withFunction('src/utils.js', 'unusedHelper', { line: 10 })
        .build();
      
      const result = detector.analyze(systemMap, {});
      
      expect(result.deadFunctions.total).toBeGreaterThan(0);
      expect(result.all.some(i => i.type === 'DEAD_FUNCTION')).toBe(true);
    });

    it('should detect broken workers', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .build();
      
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWorker('src/main.js', './missing-worker.js')
        .build();
      
      const result = detector.analyze(systemMap, advancedAnalysis);
      
      expect(result.brokenWorkers.total).toBeGreaterThan(0);
      expect(result.all.some(i => i.type === 'WORKER_NOT_FOUND')).toBe(true);
    });

    it('should detect broken dynamic imports', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withUnresolvedImport('src/main.js', './missing.js')
        .build();
      
      const result = detector.analyze(systemMap, {});
      
      expect(result.brokenDynamicImports.total).toBeGreaterThan(0);
      expect(result.all.some(i => i.type === 'DYNAMIC_IMPORT_UNRESOLVED')).toBe(true);
    });

    it('should detect duplicate functions', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'formatDate')
        .withFunction('src/b.js', 'formatDate')
        .build();
      
      const result = detector.analyze(systemMap, {});
      
      expect(result.duplicateFunctions.total).toBeGreaterThan(0);
      expect(result.all.some(i => i.type === 'DUPLICATE_FUNCTION_NAME')).toBe(true);
    });

    it('should detect suspicious URLs', () => {
      const detector = new BrokenConnectionsDetector();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000')
        .build();
      
      const result = detector.analyze({}, advancedAnalysis);
      
      expect(result.suspiciousUrls.total).toBeGreaterThan(0);
      expect(result.all.some(i => i.type === 'SUSPICIOUS_URL')).toBe(true);
    });

    it('should detect all issue types in complex scenario', () => {
      const detector = new BrokenConnectionsDetector();
      const { systemMap, advancedAnalysis } = DetectorScenarios.complex();
      
      const result = detector.analyze(systemMap, advancedAnalysis);
      
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.all.length).toBeGreaterThanOrEqual(3); // At least 3 types of issues
    });
  });

  describe('Summary Calculation', () => {
    it('should calculate correct total', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withUnresolvedImport('src/main.js', './missing.js')
        .withFunction('src/main.js', 'unusedFunc')
        .build();
      
      const result = detector.analyze(systemMap, {});
      
      expect(result.summary.total).toBe(result.all.length);
    });

    it('should categorize critical issues (HIGH severity)', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .build();
      
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWorker('src/main.js', './missing-worker.js')
        .build();
      
      const result = detector.analyze(systemMap, advancedAnalysis);
      
      expect(result.summary.critical).toBeGreaterThan(0);
    });

    it('should categorize warning issues (MEDIUM severity)', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withUnresolvedImport('src/main.js', './missing.js')
        .build();
      
      const result = detector.analyze(systemMap, {});
      
      expect(result.summary.warning).toBeGreaterThan(0);
    });

    it('should categorize info issues (LOW severity)', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withFunction('src/main.js', 'unusedFunc')
        .build();
      
      const result = detector.analyze(systemMap, {});
      
      expect(result.summary.info).toBeGreaterThan(0);
    });

    it('should sum all categories to total', () => {
      const detector = new BrokenConnectionsDetector();
      const { systemMap, advancedAnalysis } = DetectorScenarios.complex();
      
      const result = detector.analyze(systemMap, advancedAnalysis);
      
      const sum = result.summary.critical + result.summary.warning + result.summary.info;
      expect(sum).toBe(result.summary.total);
    });
  });

  describe('Individual Detection Methods', () => {
    it('should expose detectBrokenWorkers method', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create().withFile('src/main.js').build();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWorker('src/main.js', './missing.js')
        .build();
      
      const result = detector.detectBrokenWorkers(systemMap, advancedAnalysis);
      
      expect(result.total).toBe(1);
    });

    it('should expose detectBrokenDynamicImports method', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withUnresolvedImport('src/main.js', './missing.js')
        .build();
      
      const result = detector.detectBrokenDynamicImports(systemMap);
      
      expect(result.total).toBe(1);
    });

    it('should expose detectDuplicateFunctions method', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'formatDate')
        .withFunction('src/b.js', 'formatDate')
        .build();
      
      const result = detector.detectDuplicateFunctions(systemMap);
      
      expect(result.total).toBe(1);
    });

    it('should expose detectDeadFunctions method', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withFunction('src/main.js', 'unusedFunc')
        .build();
      
      const result = detector.detectDeadFunctions(systemMap);
      
      expect(result.total).toBe(1);
    });

    it('should expose detectSuspiciousUrls method', () => {
      const detector = new BrokenConnectionsDetector();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withNetworkUrl('src/api.js', 'http://localhost:3000')
        .build();
      
      const result = detector.detectSuspiciousUrls(advancedAnalysis);
      
      expect(result.total).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty system map', () => {
      const detector = new BrokenConnectionsDetector();
      const result = detector.analyze({ files: {}, functions: {} }, { fileResults: {} });
      
      expect(result.summary.total).toBe(0);
      expect(result.all).toEqual([]);
    });

    it('should handle partial data', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withFunction('src/main.js', 'unusedFunc')
        .build();
      
      // No advanced analysis provided
      const result = detector.analyze(systemMap, {});
      
      // Should still detect dead functions even without advanced analysis
      expect(result.deadFunctions.total).toBeGreaterThan(0);
    });

    it('should handle null systemMap', () => {
      const detector = new BrokenConnectionsDetector();
      
      // Should not throw
      const result = detector.analyze(null, {});
      
      expect(result.summary.total).toBe(0);
    });

    it('should handle null advancedAnalysis', () => {
      const detector = new BrokenConnectionsDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withFunction('src/main.js', 'unusedFunc')
        .build();
      
      // Should not throw
      const result = detector.analyze(systemMap, null);
      
      // Should still detect what it can without advanced analysis
      expect(result).toBeDefined();
    });
  });
});
