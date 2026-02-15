/**
 * @fileoverview Tier 3 Analysis - Cross-Component Contract Tests
 * 
 * Validates consistency between all Tier 3 detectors, scorers, and validators.
 * 
 * @module tests/unit/layer-a-analysis/tier3/contract/tier3-contract
 */

import { describe, it, expect } from 'vitest';
import { DeadCodeDetector } from '../../../../../src/layer-a-static/analyses/tier3/detectors/DeadCodeDetector.js';
import { WorkerDetector } from '../../../../../src/layer-a-static/analyses/tier3/detectors/WorkerDetector.js';
import { ImportDetector } from '../../../../../src/layer-a-static/analyses/tier3/detectors/ImportDetector.js';
import { DuplicateDetector } from '../../../../../src/layer-a-static/analyses/tier3/detectors/DuplicateDetector.js';
import { BrokenConnectionsDetector } from '../../../../../src/layer-a-static/analyses/tier3/detectors/BrokenConnectionsDetector.js';
import { detectSharedState } from '../../../../../src/layer-a-static/analyses/tier3/shared-state-detector.js';
import { detectSideEffects } from '../../../../../src/layer-a-static/analyses/tier3/side-effects-detector.js';
import { detectEventPatterns } from '../../../../../src/layer-a-static/analyses/tier3/event-detector/index.js';
import { RiskScorer } from '../../../../../src/layer-a-static/analyses/tier3/scorers/RiskScorer.js';
import { groupByFile, sortBySeverity } from '../../../../../src/layer-a-static/analyses/tier3/utils/issue-utils.js';

describe('Tier 3 Contracts', () => {
  
  describe('Issue Format', () => {
    it('all detectors return consistent result structure', () => {
      const detectors = [
        new DeadCodeDetector(),
        new WorkerDetector(),
        new ImportDetector(),
        new DuplicateDetector()
      ];
      
      const testData = {
        functions: { 'test.js': [{ name: 'unused', isExported: false, line: 1, calls: [], usedBy: [] }] },
        files: { 'test.js': { content: 'code', imports: [{ source: './test', line: 1 }] } },
        resolutions: { 'test.js': { './test': { type: 'resolved' } } }
      };
      
      for (const detector of detectors) {
        const result = detector.detect(testData);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        // All detectors should have total count
        expect(typeof result.total).toBe('number');
      }
    });

    it('issue-utils groupByFile works correctly', () => {
      const issues = [
        { id: '1', file: 'a.js', severity: 'high' },
        { id: '2', file: 'a.js', severity: 'low' },
        { id: '3', file: 'b.js', severity: 'medium' }
      ];
      const grouped = groupByFile(issues);
      
      expect(grouped['a.js']).toHaveLength(2);
      expect(grouped['b.js']).toHaveLength(1);
    });
  });

  describe('Severity Levels', () => {
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    
    it('all detectors use valid severity', () => {
      const results = [
        detectSharedState('window.x = 1;', 'test.js'),
        detectSideEffects('fetch("/api");', 'test.js'),
        detectEventPatterns('bus.on("event", fn);', 'test.js')
      ];
      
      for (const result of results) {
        if (result.severity) {
          expect(validSeverities).toContain(result.severity);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('handles invalid code gracefully', () => {
      const invalidCode = 'not valid {{{}}}';
      
      expect(() => detectSharedState(invalidCode, 'test.js')).not.toThrow();
      expect(() => detectSideEffects(invalidCode, 'test.js')).not.toThrow();
      expect(() => detectEventPatterns(invalidCode, 'test.js')).not.toThrow();
    });

    it('handles empty inputs', () => {
      expect(() => detectSharedState('', 'test.js')).not.toThrow();
      expect(() => detectSideEffects('', 'test.js')).not.toThrow();
      expect(() => detectEventPatterns('', 'test.js')).not.toThrow();
    });

    it('handles null/undefined', () => {
      expect(() => detectSharedState(null, 'test.js')).not.toThrow();
      expect(() => detectSideEffects(undefined, 'test.js')).not.toThrow();
    });
  });

  describe('Consistency', () => {
    it('window access detected consistently', () => {
      const code = 'window.x = 1;';
      const sharedState = detectSharedState(code, 'test.js');
      const sideEffects = detectSideEffects(code, 'test.js');
      
      expect(sharedState.globalAccess.length).toBeGreaterThan(0);
      expect(sideEffects.sideEffects.hasGlobalAccess || sideEffects.sideEffects.accessesWindow).toBe(true);
    });

    it('line numbers are positive integers', () => {
      const code = 'window.a = 1;\nwindow.b = 2;';
      const result = detectSharedState(code, 'test.js');
      
      for (const access of result.globalAccess) {
        expect(access.line).toBeGreaterThan(0);
        expect(Number.isInteger(access.line)).toBe(true);
      }
    });
  });
});
