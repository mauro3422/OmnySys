/**
 * @fileoverview Extractor Factory - Contract
 */

import { describe, expect, it } from 'vitest';

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

