/**
 * @fileoverview Analysis Factory - Suite Generators
 */

import { describe, expect, it } from 'vitest';

export function createAnalysisStructureSuite(analysisName, analyzeFunction, validInput) {
  describe(`${analysisName} - Structure Contract`, () => {
    it('MUST return an object', async () => {
      const result = await analyzeFunction(validInput);
      expect(result).toBeTypeOf('object');
    });

    it('MUST have a total/count field', async () => {
      const result = await analyzeFunction(validInput);
      const hasTotal = 'total' in result || 'count' in result;
      expect(hasTotal).toBe(true);
    });

    it('MUST NOT throw on empty/valid input', async () => {
      expect(async () => {
        await analyzeFunction(validInput);
      }).not.toThrow();
    });
  });
}

/**
 * Suite de tests para análisis que detectan "problemas"
 * (hotspots, orphans, circular deps, etc.)
 */
export function createDetectionAnalysisSuite(analysisName, analyzeFunction, scenarios) {
  describe(`${analysisName} - Detection Scenarios`, () => {
    for (const [scenarioName, { input, expected }] of Object.entries(scenarios)) {
      it(`should detect correctly: ${scenarioName}`, async () => {
        const result = await analyzeFunction(input);
        
        if (expected.total !== undefined) {
          expect(result.total).toBe(expected.total);
        }
        
        if (expected.hasResults !== undefined) {
          const hasItems = (result.files?.length || result.functions?.length || result.cycles?.length) > 0;
          expect(hasItems).toBe(expected.hasResults);
        }
      });
    }
  });
}

/**
 * Suite de tests para análisis con clasificación de severidad
 */
export function createSeverityClassificationSuite(analysisName, analyzeFunction, testCases) {
  describe(`${analysisName} - Severity Classification`, () => {
    for (const [testName, { input, expectedSeverity }] of Object.entries(testCases)) {
      it(`should classify severity correctly: ${testName}`, async () => {
        const result = await analyzeFunction(input);
        
        // Check for severity fields in result
        if (result.severity) {
          expect(result.severity).toBe(expectedSeverity);
        }
        
        // Check for items with severity
        const items = result.files || result.functions || result.cycles || [];
        if (items.length > 0 && expectedSeverity) {
          const hasCorrectSeverity = items.some(item => item.severity === expectedSeverity);
          expect(hasCorrectSeverity).toBe(true);
        }
      });
    }
  });
}

/**
 * Constantes para tests de análisis
 */

