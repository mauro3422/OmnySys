/**
 * @fileoverview Audit Reporter Tests
 */

import { describe, it, expect } from 'vitest';
import { generateFileReport, generateSummary } from '../../../src/audit/reporters/audit-reporter.js';
import { SCORE_THRESHOLDS } from '../../../src/audit/constants.js';
import { FieldCheckResultBuilder } from '../../factories/audit/builders.js';

describe('generateFileReport', () => {
  it('generates report for complete file', () => {
    const checkResult = new FieldCheckResultBuilder()
      .withMaxScore(8)
      .withScore(8)
      .withPresentFields(['id', 'path', 'name', 'content', 'exports', 'imports', 'dependencies', 'dependents'])
      .withMissingFields([])
      .build();
    
    const report = generateFileReport('/project/.omnysysdata/atoms/test.json', checkResult);
    
    expect(report.file).toBe('test.json');
    expect(report.path).toBe('/project/.omnysysdata/atoms/test.json');
    expect(report.hasCompleteContext).toBe(true);
    expect(report.score).toBe(100);
    expect(report.rating).toBe('EXCELLENT');
    expect(report.missingFields).toEqual([]);
  });

  it('generates report for incomplete file', () => {
    const checkResult = new FieldCheckResultBuilder()
      .withMaxScore(8)
      .withScore(5)
      .withPresentFields(['id', 'path', 'name', 'content', 'imports'])
      .withMissingFields(['exports', 'dependencies', 'dependents'])
      .build();
    
    const report = generateFileReport('/project/.omnysysdata/atoms/test.json', checkResult);
    
    expect(report.hasCompleteContext).toBe(false);
    expect(report.score).toBe(63);
    expect(report.rating).toBe('ACCEPTABLE');
    expect(report.missingFields).toContain('exports');
    expect(report.missingFields).toContain('dependencies');
    expect(report.missingFields).toContain('dependents');
  });

  it('handles zero maxScore', () => {
    const checkResult = new FieldCheckResultBuilder()
      .withMaxScore(0)
      .withScore(0)
      .build();
    
    const report = generateFileReport('/project/test.json', checkResult);
    
    expect(report.score).toBe(0);
  });

  it('extracts filename from path', () => {
    const checkResult = new FieldCheckResultBuilder().build();
    
    const report1 = generateFileReport('/a/b/c/file.json', checkResult);
    expect(report1.file).toBe('file.json');
    
    const report2 = generateFileReport('simple.json', checkResult);
    expect(report2.file).toBe('simple.json');
  });

  describe('rating calculation', () => {
    it('returns EXCELLENT for score >= 90', () => {
      const checkResult = new FieldCheckResultBuilder()
        .withMaxScore(10)
        .withScore(9)
        .build();
      
      const report = generateFileReport('/test.json', checkResult);
      
      expect(report.rating).toBe('EXCELLENT');
    });

    it('returns GOOD for score >= 70', () => {
      const checkResult = new FieldCheckResultBuilder()
        .withMaxScore(10)
        .withScore(7)
        .build();
      
      const report = generateFileReport('/test.json', checkResult);
      
      expect(report.rating).toBe('GOOD');
    });

    it('returns ACCEPTABLE for score >= 50', () => {
      const checkResult = new FieldCheckResultBuilder()
        .withMaxScore(10)
        .withScore(5)
        .build();
      
      const report = generateFileReport('/test.json', checkResult);
      
      expect(report.rating).toBe('ACCEPTABLE');
    });

    it('returns POOR for score >= 30', () => {
      const checkResult = new FieldCheckResultBuilder()
        .withMaxScore(10)
        .withScore(3)
        .build();
      
      const report = generateFileReport('/test.json', checkResult);
      
      expect(report.rating).toBe('POOR');
    });

    it('returns CRITICAL for score < 30', () => {
      const checkResult = new FieldCheckResultBuilder()
        .withMaxScore(10)
        .withScore(2)
        .build();
      
      const report = generateFileReport('/test.json', checkResult);
      
      expect(report.rating).toBe('CRITICAL');
    });
  });
});

describe('generateSummary', () => {
  it('generates summary for empty array', () => {
    const summary = generateSummary([]);
    
    expect(summary.total).toBe(0);
    expect(summary.complete).toBe(0);
    expect(summary.incomplete).toBe(0);
    expect(summary.averageScore).toBe(0);
    expect(summary.completeness).toBe(0);
  });

  it('generates summary for complete files', () => {
    const reports = [
      { hasCompleteContext: true, score: 100, rating: 'EXCELLENT' },
      { hasCompleteContext: true, score: 95, rating: 'EXCELLENT' }
    ];
    
    const summary = generateSummary(reports);
    
    expect(summary.total).toBe(2);
    expect(summary.complete).toBe(2);
    expect(summary.incomplete).toBe(0);
    expect(summary.averageScore).toBe(97.5);
    expect(summary.completeness).toBe(100);
  });

  it('generates summary for mixed files', () => {
    const reports = [
      { hasCompleteContext: true, score: 100, rating: 'EXCELLENT' },
      { hasCompleteContext: false, score: 50, rating: 'ACCEPTABLE' },
      { hasCompleteContext: false, score: 25, rating: 'CRITICAL' }
    ];
    
    const summary = generateSummary(reports);
    
    expect(summary.total).toBe(3);
    expect(summary.complete).toBe(1);
    expect(summary.incomplete).toBe(2);
    expect(summary.averageScore).toBeCloseTo(58.3, 1);
    expect(summary.completeness).toBe(33);
  });

  it('counts by rating', () => {
    const reports = [
      { hasCompleteContext: true, score: 100, rating: 'EXCELLENT' },
      { hasCompleteContext: true, score: 95, rating: 'EXCELLENT' },
      { hasCompleteContext: false, score: 75, rating: 'GOOD' },
      { hasCompleteContext: false, score: 50, rating: 'ACCEPTABLE' },
      { hasCompleteContext: false, score: 20, rating: 'CRITICAL' }
    ];
    
    const summary = generateSummary(reports);
    
    expect(summary.byRating.EXCELLENT).toBe(2);
    expect(summary.byRating.GOOD).toBe(1);
    expect(summary.byRating.ACCEPTABLE).toBe(1);
    expect(summary.byRating.CRITICAL).toBe(1);
  });

  it('calculates average score correctly', () => {
    const reports = [
      { hasCompleteContext: true, score: 100, rating: 'EXCELLENT' },
      { hasCompleteContext: false, score: 0, rating: 'CRITICAL' }
    ];
    
    const summary = generateSummary(reports);
    
    expect(summary.averageScore).toBe(50);
  });

  it('rounds average score to 1 decimal', () => {
    const reports = [
      { hasCompleteContext: true, score: 100, rating: 'EXCELLENT' },
      { hasCompleteContext: true, score: 99, rating: 'EXCELLENT' },
      { hasCompleteContext: true, score: 98, rating: 'EXCELLENT' }
    ];
    
    const summary = generateSummary(reports);
    
    expect(summary.averageScore).toBe(99);
  });
});
