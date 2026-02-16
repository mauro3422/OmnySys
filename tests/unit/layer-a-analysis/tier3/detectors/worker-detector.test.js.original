import { describe, it, expect } from 'vitest';
import { WorkerDetector } from '../../../../../src/layer-a-static/analyses/tier3/detectors/WorkerDetector.js';
import { DetectorScenarios, SystemMapBuilder, AdvancedAnalysisBuilder } from '../../../../factories/detector-test.factory.js';

describe('Tier 3 - WorkerDetector', () => {
  describe('Structure Contract', () => {
    it('should return object with total, byFile, and all properties', () => {
      const detector = new WorkerDetector();
      const { systemMap, advancedAnalysis } = DetectorScenarios.brokenWorker();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byFile');
      expect(result).toHaveProperty('all');
    });

    it('should return numeric total', () => {
      const detector = new WorkerDetector();
      const result = detector.detect({}, {});
      
      expect(typeof result.total).toBe('number');
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should NOT throw on null/undefined input', () => {
      const detector = new WorkerDetector();
      
      expect(() => detector.detect(null, null)).not.toThrow();
      expect(() => detector.detect({}, {})).not.toThrow();
    });
  });

  describe('Broken Worker Detection', () => {
    it('should detect worker pointing to non-existent file', () => {
      const detector = new WorkerDetector();
      const { systemMap, advancedAnalysis } = DetectorScenarios.brokenWorker();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      const brokenWorker = result.all.find(w => w.workerPath === './missing-worker.js');
      expect(brokenWorker).toBeDefined();
      expect(brokenWorker.type).toBe('WORKER_NOT_FOUND');
    });

    it('should not detect valid workers', () => {
      const detector = new WorkerDetector();
      const { systemMap, advancedAnalysis } = DetectorScenarios.brokenWorker();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      const validWorker = result.all.find(w => w.workerPath === './workers/valid-worker.js');
      expect(validWorker).toBeUndefined();
    });

    it('should count only broken workers', () => {
      const detector = new WorkerDetector();
      const { systemMap, advancedAnalysis } = DetectorScenarios.brokenWorker();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      expect(result.total).toBe(1);
    });

    it('should detect multiple broken workers', () => {
      const detector = new WorkerDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .build();
      
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWorker('src/main.js', './worker1.js', { line: 10 })
        .withWorker('src/main.js', './worker2.js', { line: 20 })
        .withWorker('src/main.js', './worker3.js', { line: 30 })
        .build();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      expect(result.total).toBe(3);
    });
  });

  describe('Worker Path Matching', () => {
    it('should match worker by filename', () => {
      const detector = new WorkerDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withFile('src/workers/data-processor.js')
        .build();
      
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWorker('src/main.js', './workers/data-processor.js')
        .build();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      expect(result.total).toBe(0);
    });

    it('should match worker without extension', () => {
      const detector = new WorkerDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withFile('workers/calculator.js')
        .build();
      
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWorker('src/main.js', 'workers/calculator')
        .build();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      expect(result.total).toBe(0);
    });

    it('should detect worker with different extension', () => {
      const detector = new WorkerDetector();
      const systemMap = SystemMapBuilder.create()
        .withFile('src/main.js')
        .withFile('workers/task.ts')
        .build();
      
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWorker('src/main.js', './workers/task.js')
        .build();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      // Worker exists but with different extension - should not be flagged
      expect(result.total).toBe(0);
    });
  });

  describe('Issue Format', () => {
    it('should include all required fields', () => {
      const detector = new WorkerDetector();
      const { systemMap, advancedAnalysis } = DetectorScenarios.brokenWorker();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      const issue = result.all[0];
      expect(issue).toHaveProperty('sourceFile');
      expect(issue).toHaveProperty('workerPath');
      expect(issue).toHaveProperty('line');
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('reason');
      expect(issue).toHaveProperty('suggestion');
    });

    it('should have HIGH severity', () => {
      const detector = new WorkerDetector();
      const { systemMap, advancedAnalysis } = DetectorScenarios.brokenWorker();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      expect(result.all[0].severity).toBe('HIGH');
    });

    it('should include line number', () => {
      const detector = new WorkerDetector();
      const { systemMap, advancedAnalysis } = DetectorScenarios.brokenWorker();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      expect(result.all[0].line).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty advanced analysis', () => {
      const detector = new WorkerDetector();
      const systemMap = SystemMapBuilder.create().withFile('src/main.js').build();
      
      const result = detector.detect(systemMap, {});
      
      expect(result.total).toBe(0);
    });

    it('should handle missing fileResults', () => {
      const detector = new WorkerDetector();
      const systemMap = SystemMapBuilder.create().withFile('src/main.js').build();
      
      const result = detector.detect(systemMap, { fileResults: {} });
      
      expect(result.total).toBe(0);
    });

    it('should handle missing webWorkers in file analysis', () => {
      const detector = new WorkerDetector();
      const systemMap = SystemMapBuilder.create().withFile('src/main.js').build();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withFile('src/main.js', { networkCalls: { urls: [] } })
        .build();
      
      const result = detector.detect(systemMap, advancedAnalysis);
      
      expect(result.total).toBe(0);
    });

    it('should handle empty system map files', () => {
      const detector = new WorkerDetector();
      const advancedAnalysis = AdvancedAnalysisBuilder.create()
        .withWorker('src/main.js', './worker.js')
        .build();
      
      const result = detector.detect({ files: {} }, advancedAnalysis);
      
      // Worker should be flagged as broken since no files exist
      expect(result.total).toBe(1);
    });
  });
});
