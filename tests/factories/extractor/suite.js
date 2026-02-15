/**
 * @fileoverview Extractor Factory - Suite
 */

import { describe, expect, it } from 'vitest';

export function createExtractorSuite(config) {
  const { name, extensions, parseFunction, fixtures } = config;
  
  return describe(`Extractor: ${name}`, () => {
    
    describe('Contract Compliance', () => {
      it('returns valid FileInfo structure', async () => {
        const result = await parseFunction(fixtures.empty || '', extensions[0]);
        
        // Required fields
        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('fileName');
        expect(result).toHaveProperty('imports');
        expect(result).toHaveProperty('exports');
        expect(result).toHaveProperty('definitions');
        
        // Types
        expect(typeof result.filePath).toBe('string');
        expect(typeof result.fileName).toBe('string');
        expect(Array.isArray(result.imports)).toBe(true);
        expect(Array.isArray(result.exports)).toBe(true);
        expect(Array.isArray(result.definitions)).toBe(true);
      });
      
      it('handles empty files gracefully', async () => {
        const result = await parseFunction('', extensions[0]);
        expect(result.imports).toEqual([]);
        expect(result.exports).toEqual([]);
      });
    });
    
    describe.each(extensions)('Extension: %s', (ext) => {
      const extFixtures = fixtures[ext] || fixtures;
      
      if (extFixtures.withImports) {
        it('extracts imports', async () => {
          const result = await parseFunction(extFixtures.withImports, ext);
          expect(result.imports.length).toBeGreaterThan(0);
        });
      }
      
      if (extFixtures.withExports) {
        it('extracts exports', async () => {
          const result = await parseFunction(extFixtures.withExports, ext);
          expect(result.exports.length).toBeGreaterThan(0);
        });
      }
      
      if (extFixtures.withFunctions) {
        it('extracts functions', async () => {
          const result = await parseFunction(extFixtures.withFunctions, ext);
          expect(result.functions.length).toBeGreaterThan(0);
        });
      }
      
      if (extFixtures.withClasses) {
        it('extracts classes', async () => {
          const result = await parseFunction(extFixtures.withClasses, ext);
          const classes = result.definitions.filter(d => d.type === 'class');
          expect(classes.length).toBeGreaterThan(0);
        });
      }
    });
    
  });
}

/**
 * Creates contract tests for an extractor
 * Verifies it implements the standard extractor interface
 */

