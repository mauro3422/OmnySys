import { describe, it, expect } from 'vitest';
import { RiskScorer } from '../../../../../src/layer-a-static/analyses/tier3/scorers/RiskScorer.js';
import { Tier3AnalysisFactory, RiskScenarios } from '../../../../factories/tier3-analysis.factory.js';

describe('Tier 3 - RiskScorer', () => {
  describe('Construction', () => {
    it('should create RiskScorer instance', () => {
      const scorer = new RiskScorer();
      expect(scorer).toBeInstanceOf(RiskScorer);
    });

    it('should initialize with calculators', () => {
      const scorer = new RiskScorer();
      expect(scorer.scoreCalculator).toBeDefined();
      expect(scorer.severityCalculator).toBeDefined();
      expect(scorer.reportGenerator).toBeDefined();
    });
  });

  describe('Single File Calculation', () => {
    it('should calculate risk for a single file', () => {
      const scorer = new RiskScorer();
      const { fileAnalysis, semanticConnections, sideEffects, graphMetrics } = RiskScenarios.mediumRisk();
      
      const result = scorer.calculate(fileAnalysis, semanticConnections, sideEffects.sideEffects, graphMetrics);
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('severity');
    });

    it('should use default values for missing parameters', () => {
      const scorer = new RiskScorer();
      
      const result = scorer.calculate();
      
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.breakdown).toBeDefined();
    });

    it('should handle partial parameters', () => {
      const scorer = new RiskScorer();
      const { fileAnalysis } = RiskScenarios.lowRisk();
      
      const result = scorer.calculate(fileAnalysis);
      
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Batch Calculation (calculateAll)', () => {
    it('should calculate risk for all files in system map', () => {
      const scorer = new RiskScorer();
      const systemMap = {
        files: {
          'low.js': RiskScenarios.lowRisk().fileAnalysis,
          'high.js': RiskScenarios.highRisk().fileAnalysis
        }
      };
      
      const results = scorer.calculateAll(systemMap, {}, {}, {});
      
      expect(results).toHaveProperty('low.js');
      expect(results).toHaveProperty('high.js');
      expect(results['low.js']).toHaveProperty('total');
      expect(results['high.js']).toHaveProperty('total');
    });

    it('should handle empty system map', () => {
      const scorer = new RiskScorer();
      const systemMap = { files: {} };
      
      const results = scorer.calculateAll(systemMap, {}, {}, {});
      
      expect(Object.keys(results)).toHaveLength(0);
    });

    it('should handle missing files property', () => {
      const scorer = new RiskScorer();
      const systemMap = {};
      
      const results = scorer.calculateAll(systemMap, {}, {}, {});
      
      expect(Object.keys(results)).toHaveLength(0);
    });

    it('should map semantic connections by file', () => {
      const scorer = new RiskScorer();
      const systemMap = {
        files: {
          'test.js': { functions: [], imports: [], exports: [] }
        }
      };
      const semanticConnectionsByFile = {
        'test.js': [
          { target: 'a.js', severity: 'high' },
          { target: 'b.js', severity: 'critical' }
        ]
      };
      
      const results = scorer.calculateAll(systemMap, semanticConnectionsByFile, {}, {});
      
      expect(results['test.js'].breakdown.semanticConnections).toBeGreaterThanOrEqual(0);
    });

    it('should map side effects by file', () => {
      const scorer = new RiskScorer();
      const systemMap = {
        files: {
          'test.js': { functions: [], imports: [], exports: [] }
        }
      };
      const sideEffectsByFile = {
        'test.js': {
          sideEffects: { network: true, storage: true }
        }
      };
      
      const results = scorer.calculateAll(systemMap, {}, sideEffectsByFile, {});
      
      expect(results['test.js'].breakdown.sideEffects).toBeGreaterThan(0);
    });
  });

  describe('High Risk Identification', () => {
    it('should identify high risk files above threshold', () => {
      const scorer = new RiskScorer();
      const riskScores = {
        'low.js': { total: 2, severity: 'low', explanation: 'Low risk' },
        'high.js': { total: 8, severity: 'high', explanation: 'High risk' },
        'critical.js': { total: 10, severity: 'critical', explanation: 'Critical risk' }
      };
      
      const highRisk = scorer.identifyHighRiskFiles(riskScores, 6.0);
      
      expect(highRisk).toHaveLength(2);
      expect(highRisk.map(f => f.file)).toContain('high.js');
      expect(highRisk.map(f => f.file)).toContain('critical.js');
    });

    it('should sort high risk files by score descending', () => {
      const scorer = new RiskScorer();
      const riskScores = {
        'a.js': { total: 7, severity: 'high', explanation: '' },
        'b.js': { total: 9, severity: 'critical', explanation: '' },
        'c.js': { total: 8, severity: 'high', explanation: '' }
      };
      
      const highRisk = scorer.identifyHighRiskFiles(riskScores, 6.0);
      
      expect(highRisk[0].file).toBe('b.js');
      expect(highRisk[1].file).toBe('c.js');
      expect(highRisk[2].file).toBe('a.js');
    });

    it('should return empty array when no high risk files', () => {
      const scorer = new RiskScorer();
      const riskScores = {
        'low.js': { total: 2, severity: 'low', explanation: '' }
      };
      
      const highRisk = scorer.identifyHighRiskFiles(riskScores, 6.0);
      
      expect(highRisk).toEqual([]);
    });

    it('should use custom threshold', () => {
      const scorer = new RiskScorer();
      const riskScores = {
        'medium.js': { total: 4, severity: 'medium', explanation: '' },
        'high.js': { total: 8, severity: 'high', explanation: '' }
      };
      
      const highRisk = scorer.identifyHighRiskFiles(riskScores, 5.0);
      
      expect(highRisk).toHaveLength(1);
      expect(highRisk[0].file).toBe('high.js');
    });

    it('should include file, score, severity, and explanation in results', () => {
      const scorer = new RiskScorer();
      const riskScores = {
        'test.js': { total: 8, severity: 'high', explanation: 'Test explanation' }
      };
      
      const highRisk = scorer.identifyHighRiskFiles(riskScores, 6.0);
      
      expect(highRisk[0]).toMatchObject({
        file: 'test.js',
        score: 8,
        severity: 'high',
        explanation: 'Test explanation'
      });
    });
  });

  describe('Report Generation', () => {
    it('should generate risk report', () => {
      const scorer = new RiskScorer();
      const riskScores = {
        'file1.js': { total: 5, severity: 'medium', explanation: 'Medium risk' },
        'file2.js': { total: 8, severity: 'high', explanation: 'High risk' }
      };
      
      const report = scorer.generateReport(riskScores);
      
      expect(report).toBeDefined();
      expect(typeof report).toBe('object');
    });

    it('should pass options to report generator', () => {
      const scorer = new RiskScorer();
      const riskScores = { 'test.js': { total: 5, severity: 'medium' } };
      const options = { format: 'json', includeMetrics: true };
      
      const report = scorer.generateReport(riskScores, options);
      
      expect(report).toBeDefined();
    });
  });

  describe('Severity Calculation', () => {
    it('should calculate severity from score', () => {
      const scorer = new RiskScorer();
      
      const low = scorer.calculateSeverity(2);
      const medium = scorer.calculateSeverity(5);
      const high = scorer.calculateSeverity(8);
      
      expect(typeof low).toBe('string');
      expect(typeof medium).toBe('string');
      expect(typeof high).toBe('string');
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow', () => {
      const scorer = new RiskScorer();
      
      // 1. Calculate all risks
      const systemMap = {
        files: {
          'low.js': RiskScenarios.lowRisk().fileAnalysis,
          'medium.js': RiskScenarios.mediumRisk().fileAnalysis,
          'high.js': RiskScenarios.highRisk().fileAnalysis
        }
      };
      
      const riskScores = scorer.calculateAll(systemMap, {}, {}, {});
      
      // 2. Identify high risk
      const highRiskFiles = scorer.identifyHighRiskFiles(riskScores, 6.0);
      
      // 3. Generate report
      const report = scorer.generateReport(riskScores);
      
      expect(Object.keys(riskScores)).toHaveLength(3);
      expect(highRiskFiles.length).toBeGreaterThanOrEqual(0);
      expect(report).toBeDefined();
    });
  });
});
