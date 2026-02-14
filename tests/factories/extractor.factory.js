/**
 * @fileoverview Test Factory for Extractors
 * 
 * Generates a complete test suite for any extractor.
 * Usage: Create tests for new extractors with minimal code.
 * 
 * @example
 * import { createExtractorSuite } from '../factories/extractor.factory.js';
 * import { parseFile } from '#layer-a/parser/index.js';
 * 
 * createExtractorSuite({
 *   name: 'JavaScript',
 *   extensions: ['js', 'mjs'],
 *   parseFunction: (code, ext) => parseFile(`test.${ext}`, code),
 *   fixtures: { ... }
 * });
 */

import { describe, it, expect } from 'vitest';

/**
 * Creates a complete test suite for an extractor
 * @param {Object} config - Configuration object
 * @param {string} config.name - Name of the extractor (e.g., 'JavaScript')
 * @param {string[]} config.extensions - File extensions (e.g., ['js', 'mjs'])
 * @param {Function} config.parseFunction - Function to parse code (code, ext) => result
 * @param {Object} config.fixtures - Test fixtures for each extension
 */
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
export function createExtractorContract(config) {
  const { name, extensions, parseFunction } = config;
  
  return describe(`Contract: ${name} Extractor`, () => {
    
    describe.each(extensions)('Extension: %s', (ext) => {
      
      it('MUST return filePath string', async () => {
        const result = await parseFunction('', ext);
        expect(typeof result.filePath).toBe('string');
      });
      
      it('MUST return imports array', async () => {
        const result = await parseFunction('', ext);
        expect(Array.isArray(result.imports)).toBe(true);
      });
      
      it('MUST return exports array', async () => {
        const result = await parseFunction('', ext);
        expect(Array.isArray(result.exports)).toBe(true);
      });
      
      it('MUST return definitions array', async () => {
        const result = await parseFunction('', ext);
        expect(Array.isArray(result.definitions)).toBe(true);
      });
      
      it('MUST handle errors gracefully', async () => {
        const result = await parseFunction('invalid syntax !!!', ext);
        // Should not throw, should return object with error info
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
      
    });
    
  });
}
