/**
 * @fileoverview Field Checker Tests
 */

import { describe, it, expect } from 'vitest';
import { checkFields, calculateCompletenessScore } from '../../../src/audit/checks/field-checker.js';
import { REQUIRED_FIELDS } from '../../../src/audit/constants.js';
import { AnalysisDataBuilder } from '../../factories/audit/builders.js';

describe('checkFields', () => {
  describe('basic fields', () => {
    it('detects all present basic fields', () => {
      const data = new AnalysisDataBuilder().buildMinimal();
      
      const result = checkFields(data);
      
      expect(result.missingFields).toEqual([]);
      expect(result.presentFields).toContain('id');
      expect(result.presentFields).toContain('path');
      expect(result.presentFields).toContain('name');
      expect(result.presentFields).toContain('content');
      expect(result.presentFields).toContain('exports');
      expect(result.presentFields).toContain('imports');
      expect(result.presentFields).toContain('dependencies');
      expect(result.presentFields).toContain('dependents');
      expect(result.maxScore).toBe(8);
      expect(result.score).toBe(8);
    });

    it('detects missing basic fields', () => {
      const data = new AnalysisDataBuilder()
        .missingBasicFields(['id', 'name', 'content'])
        .build();
      
      const result = checkFields(data);
      
      expect(result.missingFields).toContain('id');
      expect(result.missingFields).toContain('name');
      expect(result.missingFields).toContain('content');
      expect(result.score).toBe(5);
      expect(result.maxScore).toBe(8);
    });

    it('counts undefined fields as missing', () => {
      const data = new AnalysisDataBuilder()
        .withId(undefined)
        .build();
      
      const result = checkFields(data);
      
      expect(result.missingFields).toContain('id');
    });

    it('counts null fields as present', () => {
      const data = new AnalysisDataBuilder()
        .withId(null)
        .build();
      
      const result = checkFields(data);
      
      expect(result.presentFields).toContain('id');
    });
  });

  describe('metadata fields', () => {
    it('checks metadata fields when present', () => {
      const data = new AnalysisDataBuilder()
        .withCompleteMetadata()
        .build();
      
      const result = checkFields(data);
      
      expect(result.presentFields).toContain('metadata.exportCount');
      expect(result.presentFields).toContain('metadata.dependentCount');
      expect(result.presentFields).toContain('metadata.importCount');
      expect(result.presentFields).toContain('metadata.functionCount');
      expect(result.presentFields).toContain('metadata.hasJSDoc');
      expect(result.presentFields).toContain('metadata.hasAsync');
      expect(result.presentFields).toContain('metadata.hasErrors');
    });

    it('detects missing metadata fields', () => {
      const data = new AnalysisDataBuilder()
        .withPartialMetadata(['hasJSDoc', 'hasAsync'])
        .build();
      
      const result = checkFields(data);
      
      expect(result.missingFields).toContain('metadata.hasJSDoc');
      expect(result.missingFields).toContain('metadata.hasAsync');
    });

    it('skips metadata check when metadata is absent', () => {
      const data = new AnalysisDataBuilder().buildMinimal();
      
      const result = checkFields(data);
      
      expect(result.presentFields).not.toContainEqual(expect.stringContaining('metadata.'));
    });
  });

  describe('analysis fields', () => {
    it('checks analysis fields when present', () => {
      const data = new AnalysisDataBuilder()
        .withCompleteAnalysis()
        .build();
      
      const result = checkFields(data);
      
      expect(result.presentFields).toContain('analysis.confidence');
      expect(result.presentFields).toContain('analysis.reasoning');
      expect(result.presentFields).toContain('analysis.analysisType');
    });

    it('detects missing analysis fields', () => {
      const data = new AnalysisDataBuilder()
        .withPartialAnalysis(['reasoning'])
        .build();
      
      const result = checkFields(data);
      
      expect(result.missingFields).toContain('analysis.reasoning');
    });

    it('skips analysis check when analysis is absent', () => {
      const data = new AnalysisDataBuilder().buildMinimal();
      
      const result = checkFields(data);
      
      expect(result.presentFields).not.toContainEqual(expect.stringContaining('analysis.'));
    });
  });

  describe('quality fields', () => {
    it('checks quality fields when present', () => {
      const data = new AnalysisDataBuilder()
        .withCompleteQuality()
        .build();
      
      const result = checkFields(data);
      
      expect(result.presentFields).toContain('quality.qualityScore');
      expect(result.presentFields).toContain('quality.issues');
      expect(result.presentFields).toContain('quality.unusedExports');
      expect(result.presentFields).toContain('quality.isDeadCode');
    });

    it('detects missing quality fields', () => {
      const data = new AnalysisDataBuilder()
        .withPartialQuality(['qualityScore', 'isDeadCode'])
        .build();
      
      const result = checkFields(data);
      
      expect(result.missingFields).toContain('quality.qualityScore');
      expect(result.missingFields).toContain('quality.isDeadCode');
    });

    it('skips quality check when quality is absent', () => {
      const data = new AnalysisDataBuilder().buildMinimal();
      
      const result = checkFields(data);
      
      expect(result.presentFields).not.toContainEqual(expect.stringContaining('quality.'));
    });
  });

  describe('semantic fields', () => {
    it('checks semantic fields when present', () => {
      const data = new AnalysisDataBuilder()
        .withCompleteSemantic()
        .build();
      
      const result = checkFields(data);
      
      expect(result.presentFields).toContain('semantic.localStorageKeys');
      expect(result.presentFields).toContain('semantic.eventNames');
      expect(result.presentFields).toContain('semantic.sharedState');
      expect(result.presentFields).toContain('semantic.connections');
    });

    it('detects missing semantic fields', () => {
      const data = new AnalysisDataBuilder()
        .withPartialSemantic(['connections'])
        .build();
      
      const result = checkFields(data);
      
      expect(result.missingFields).toContain('semantic.connections');
    });

    it('skips semantic check when semantic is absent', () => {
      const data = new AnalysisDataBuilder().buildMinimal();
      
      const result = checkFields(data);
      
      expect(result.presentFields).not.toContainEqual(expect.stringContaining('semantic.'));
    });
  });

  describe('complete data', () => {
    it('returns no missing fields for complete data', () => {
      const data = new AnalysisDataBuilder().buildComplete();
      
      const result = checkFields(data);
      
      expect(result.missingFields).toEqual([]);
    });

    it('calculates correct max score', () => {
      const data = new AnalysisDataBuilder().buildComplete();
      
      const result = checkFields(data);
      
      const expectedMax = REQUIRED_FIELDS.basic.length 
        + REQUIRED_FIELDS.metadata.length 
        + REQUIRED_FIELDS.llm.length 
        + REQUIRED_FIELDS.quality.length 
        + REQUIRED_FIELDS.semantic.length;
      
      expect(result.maxScore).toBe(expectedMax);
      expect(result.score).toBe(expectedMax);
    });
  });

  describe('empty data', () => {
    it('handles empty object', () => {
      const result = checkFields({});
      
      expect(result.missingFields).toEqual(expect.arrayContaining(REQUIRED_FIELDS.basic));
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(REQUIRED_FIELDS.basic.length);
    });
  });
});

describe('calculateCompletenessScore', () => {
  it('returns 100 for complete result', () => {
    const checkResult = {
      score: 8,
      maxScore: 8,
      missingFields: [],
      presentFields: ['id', 'path', 'name']
    };
    
    expect(calculateCompletenessScore(checkResult)).toBe(100);
  });

  it('returns 0 for zero maxScore', () => {
    const checkResult = {
      score: 0,
      maxScore: 0,
      missingFields: [],
      presentFields: []
    };
    
    expect(calculateCompletenessScore(checkResult)).toBe(0);
  });

  it('calculates partial score', () => {
    const checkResult = {
      score: 6,
      maxScore: 8,
      missingFields: ['content', 'exports'],
      presentFields: ['id', 'path', 'name', 'imports', 'dependencies', 'dependents']
    };
    
    expect(calculateCompletenessScore(checkResult)).toBe(75);
  });

  it('rounds to nearest integer', () => {
    const checkResult = {
      score: 7,
      maxScore: 8,
      missingFields: ['content'],
      presentFields: ['id', 'path', 'name', 'imports', 'dependencies', 'dependents', 'exports']
    };
    
    expect(calculateCompletenessScore(checkResult)).toBe(88);
  });
});
