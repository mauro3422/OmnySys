/**
 * @fileoverview issue-detectors-index.test.js
 * 
 * Tests para el orquestador de detectores de issues
 * 
 * @module tests/unit/layer-b-semantic/issue-detectors/index
 */

import { describe, it, expect } from 'vitest';
import {
  detectSemanticIssues,
  buildGlobalState,
  detectOrphanedFiles,
  detectUnhandledEvents,
  detectUndefinedSharedState,
  detectDeadSharedState,
  detectConnectionHotspots,
  detectSuspiciousPatterns,
  generateIssuesReport
} from '#layer-a/analyses/tier3/issue-detectors/index.js';
import { EnrichedResultsBuilder } from '../../../../../factories/layer-b-metadata/builders.js';

describe('issue-detectors/index', () => {
  describe('exports', () => {
    it('should export detectSemanticIssues', () => {
      expect(typeof detectSemanticIssues).toBe('function');
    });

    it('should export all individual detectors', () => {
      expect(typeof buildGlobalState).toBe('function');
      expect(typeof detectOrphanedFiles).toBe('function');
      expect(typeof detectUnhandledEvents).toBe('function');
      expect(typeof detectUndefinedSharedState).toBe('function');
      expect(typeof detectDeadSharedState).toBe('function');
      expect(typeof detectConnectionHotspots).toBe('function');
      expect(typeof detectSuspiciousPatterns).toBe('function');
      expect(typeof generateIssuesReport).toBe('function');
    });
  });

  describe('detectSemanticIssues', () => {
    it('should return issues object with all categories', () => {
      const enrichedResults = { files: {} };
      
      const result = detectSemanticIssues(enrichedResults);
      
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('timestamp');
      expect(result.issues).toHaveProperty('orphanedFilesWithSideEffects');
      expect(result.issues).toHaveProperty('unhandledEvents');
      expect(result.issues).toHaveProperty('undefinedSharedState');
      expect(result.issues).toHaveProperty('deadSharedState');
      expect(result.issues).toHaveProperty('connectionHotspots');
      expect(result.issues).toHaveProperty('suspiciousPatterns');
    });

    it('should calculate total issues count', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .withOrphanedFile('src/orphan.js')
        .build();
      
      const result = detectSemanticIssues(enrichedResults);
      
      expect(result.stats.totalIssues).toBeGreaterThanOrEqual(0);
      expect(typeof result.stats.totalIssues).toBe('number');
    });

    it('should include severity breakdown', () => {
      const enrichedResults = { files: {} };
      
      const result = detectSemanticIssues(enrichedResults);
      
      expect(result.stats.bySeverity).toHaveProperty('high');
      expect(result.stats.bySeverity).toHaveProperty('medium');
      expect(result.stats.bySeverity).toHaveProperty('low');
    });

    it('should include timestamp', () => {
      const enrichedResults = { files: {} };
      
      const result = detectSemanticIssues(enrichedResults);
      
      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should handle empty results', () => {
      const enrichedResults = { files: {} };
      
      const result = detectSemanticIssues(enrichedResults);
      
      expect(result.stats.totalIssues).toBe(0);
    });

    it('should handle undefined files', () => {
      const enrichedResults = {};
      
      const result = detectSemanticIssues(enrichedResults);
      
      expect(result.issues.orphanedFilesWithSideEffects).toEqual([]);
    });
  });
});
