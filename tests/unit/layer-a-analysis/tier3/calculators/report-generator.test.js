import { describe, it, expect } from 'vitest';
import { ReportGenerator } from '../../../../../src/layer-a-static/analyses/tier3/calculators/ReportGenerator.js';

describe('Tier 3 - ReportGenerator', () => {
  describe('Construction', () => {
    it('should create ReportGenerator instance', () => {
      const generator = new ReportGenerator();
      expect(generator).toBeInstanceOf(ReportGenerator);
    });
  });

  describe('Report Structure', () => {
    it('should generate report with summary, risk files, and recommendations', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'test.js': { total: 5, severity: 'medium', explanation: 'Test' }
      };
      
      const report = generator.generate(riskScores);
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('highRiskFiles');
      expect(report).toHaveProperty('mediumRiskFiles');
      expect(report).toHaveProperty('recommendations');
    });

    it('should include correct summary statistics', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'low.js': { total: 2, severity: 'low', explanation: '' },
        'medium.js': { total: 4, severity: 'medium', explanation: '' },
        'high.js': { total: 7, severity: 'high', explanation: '' },
        'critical.js': { total: 9, severity: 'critical', explanation: '' }
      };
      
      const report = generator.generate(riskScores);
      
      expect(report.summary.totalFiles).toBe(4);
      expect(report.summary.criticalCount).toBe(1);
      expect(report.summary.highCount).toBe(1);
      expect(report.summary.mediumCount).toBe(1);
      expect(report.summary.lowCount).toBe(1);
    });

    it('should calculate average score', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'a.js': { total: 2, severity: 'low', explanation: '' },
        'b.js': { total: 8, severity: 'high', explanation: '' }
      };
      
      const report = generator.generate(riskScores);
      
      expect(report.summary.averageScore).toBe('5.00');
    });
  });

  describe('Risk File Categorization', () => {
    it('should categorize high risk files correctly', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'low.js': { total: 2, severity: 'low', explanation: '' },
        'high.js': { total: 7, severity: 'high', explanation: 'High risk' },
        'critical.js': { total: 9, severity: 'critical', explanation: 'Critical risk' }
      };
      
      const report = generator.generate(riskScores);
      
      expect(report.highRiskFiles).toHaveLength(2);
      expect(report.mediumRiskFiles).toHaveLength(0);
    });

    it('should categorize medium risk files correctly', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'medium1.js': { total: 4, severity: 'medium', explanation: '' },
        'medium2.js': { total: 5, severity: 'medium', explanation: '' }
      };
      
      const report = generator.generate(riskScores);
      
      expect(report.mediumRiskFiles).toHaveLength(2);
      expect(report.highRiskFiles).toHaveLength(0);
    });

    it('should sort risk files by score descending', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'a.js': { total: 7, severity: 'high', explanation: '' },
        'b.js': { total: 9, severity: 'critical', explanation: '' },
        'c.js': { total: 8, severity: 'high', explanation: '' }
      };
      
      const report = generator.generate(riskScores);
      
      expect(report.highRiskFiles[0].file).toBe('b.js');
      expect(report.highRiskFiles[1].file).toBe('c.js');
      expect(report.highRiskFiles[2].file).toBe('a.js');
    });

    it('should include file details in risk lists', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'test.js': { total: 8, severity: 'high', explanation: 'Test explanation' }
      };
      
      const report = generator.generate(riskScores);
      
      expect(report.highRiskFiles[0]).toMatchObject({
        file: 'test.js',
        total: 8,
        severity: 'high',
        explanation: 'Test explanation'
      });
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendation for high risk files', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'high.js': { total: 7, severity: 'high', explanation: '' }
      };
      
      const report = generator.generate(riskScores);
      
      const highRec = report.recommendations.find(r => r.priority === 'high');
      expect(highRec).toBeDefined();
      expect(highRec.message).toContain('1 high-risk files');
    });

    it('should generate critical recommendation for too many high risk files', () => {
      const generator = new ReportGenerator();
      const riskScores = {};
      for (let i = 0; i < 7; i++) {
        riskScores[`high${i}.js`] = { total: 7, severity: 'high', explanation: '' };
      }
      
      const report = generator.generate(riskScores);
      
      const criticalRec = report.recommendations.find(
        r => r.priority === 'critical' && r.message.includes('Too many high-risk files')
      );
      expect(criticalRec).toBeDefined();
    });

    it('should generate critical recommendation for critical files', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'critical.js': { total: 9, severity: 'critical', explanation: '' }
      };
      
      const report = generator.generate(riskScores);
      
      const criticalRec = report.recommendations.find(
        r => r.priority === 'critical' && r.message.includes('critical risk')
      );
      expect(criticalRec).toBeDefined();
    });

    it('should return empty recommendations for all low risk', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'low.js': { total: 2, severity: 'low', explanation: '' }
      };
      
      const report = generator.generate(riskScores);
      
      expect(report.recommendations).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty risk scores', () => {
      const generator = new ReportGenerator();
      const report = generator.generate({});
      
      expect(report.summary.totalFiles).toBe(0);
      expect(report.summary.averageScore).toBe('0.00');
      expect(report.highRiskFiles).toEqual([]);
      expect(report.mediumRiskFiles).toEqual([]);
      expect(report.recommendations).toEqual([]);
    });

    it('should handle threshold option', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'test.js': { total: 5, severity: 'medium', explanation: '' }
      };
      
      const report = generator.generate(riskScores, { threshold: 7.0 });
      
      expect(report.summary.totalFiles).toBe(1);
    });

    it('should handle single file', () => {
      const generator = new ReportGenerator();
      const riskScores = {
        'only.js': { total: 5, severity: 'medium', explanation: 'Only file' }
      };
      
      const report = generator.generate(riskScores);
      
      expect(report.summary.totalFiles).toBe(1);
      expect(report.summary.averageScore).toBe('5.00');
      expect(report.mediumRiskFiles).toHaveLength(1);
    });
  });
});
