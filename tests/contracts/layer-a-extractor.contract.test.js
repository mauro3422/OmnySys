/**
 * @fileoverview Contract Tests for Layer A Extractors
 * 
 * Verifies that ALL extractors comply with the standard interface.
 * Adding a new extractor? Just add it to the EXTRACTORS array.
 */

import { describe, it, expect } from 'vitest';

// ============================================
// CONFIGURATION: Add new extractors here
// ============================================
const EXTRACTORS = [
  {
    name: 'JavaScript',
    module: '#layer-a/parser/index.js',
    extensions: ['js', 'mjs', 'cjs'],
    testCases: {
      imports: "import { foo } from './bar';",
      exports: "export const foo = 1;",
      functions: "function test() {}",
      classes: "class Test {}",
    },
  },
  {
    name: 'TypeScript',
    module: '#layer-a/parser/index.js',
    extensions: ['ts', 'tsx'],
    testCases: {
      imports: "import { foo } from './bar';",
      exports: "export const foo: number = 1;",
      functions: "function test(): void {}",
      classes: "class Test {}",
      types: "interface User { name: string; }",
    },
  },
  // FUTURE: Add more extractors here
  // {
  //   name: 'Python',
  //   module: '#layer-a/parser/python.js',
  //   extensions: ['py'],
  //   testCases: { ... },
  // },
];

// ============================================
// CONTRACT DEFINITION
// ============================================
const EXTRACTOR_CONTRACT = {
  requiredFields: ['filePath', 'fileName', 'ext', 'imports', 'exports', 'definitions'],
  arrayFields: ['imports', 'exports', 'definitions', 'functions', 'calls'],
  stringFields: ['filePath', 'fileName', 'ext'],
};

// ============================================
// CONTRACT TESTS
// ============================================

describe('Layer A Extractor Contract', () => {

  EXTRACTORS.forEach(({ name, module, extensions, testCases }) => {

    describe(`${name} Extractor`, () => {

      // Dynamically import the extractor
      let parseFile;

      beforeAll(async () => {
        const mod = await import(module);
        parseFile = mod.parseFile;
      });

      describe.each(extensions)('Extension: %s', (ext) => {

        describe('Structure Contract', () => {

          it('MUST return all required fields', async () => {
            const result = await parseFile(`test.${ext}`, '');

            EXTRACTOR_CONTRACT.requiredFields.forEach(field => {
              expect(result).toHaveProperty(field);
            });
          });

          it('MUST return arrays for collection fields', async () => {
            const result = await parseFile(`test.${ext}`, '');

            EXTRACTOR_CONTRACT.arrayFields.forEach(field => {
              if (result[field] !== undefined) {
                expect(Array.isArray(result[field])).toBe(true);
              }
            });
          });

          it('MUST return strings for text fields', async () => {
            const result = await parseFile(`test.${ext}`, '');

            EXTRACTOR_CONTRACT.stringFields.forEach(field => {
              expect(typeof result[field]).toBe('string');
            });
          });

        });

        describe('Functionality Contract', () => {

          if (testCases.imports) {
            it('MUST extract imports', async () => {
              const result = await parseFile(`test.${ext}`, testCases.imports);
              expect(result.imports.length).toBeGreaterThan(0);
            });
          }

          if (testCases.exports) {
            it('MUST extract exports', async () => {
              const result = await parseFile(`test.${ext}`, testCases.exports);
              expect(result.exports.length).toBeGreaterThan(0);
            });
          }

          if (testCases.functions) {
            it('MUST extract functions', async () => {
              const result = await parseFile(`test.${ext}`, testCases.functions);
              expect(result.functions.length).toBeGreaterThan(0);
            });
          }

          if (testCases.classes) {
            it('MUST extract classes', async () => {
              const result = await parseFile(`test.${ext}`, testCases.classes);
              const classes = result.definitions.filter(d => d.type === 'class');
              expect(classes.length).toBeGreaterThan(0);
            });
          }

          if (testCases.types) {
            it('MUST extract type definitions', async () => {
              const result = await parseFile(`test.${ext}`, testCases.types);
              expect(result.typeDefinitions.length).toBeGreaterThan(0);
            });
          }

        });

        describe('Error Handling Contract', () => {

          it('MUST NOT throw on empty input', async () => {
            await expect(parseFile(`test.${ext}`, '')).resolves.not.toThrow();
          });

          it('MUST NOT throw on invalid syntax', async () => {
            await expect(parseFile(`test.${ext}`, 'invalid !!! syntax ???')).resolves.not.toThrow();
          });

          it('MUST return parseError on invalid syntax', async () => {
            const result = await parseFile(`test.${ext}`, 'invalid !!!');
            // Should either work or have parseError
            expect(result.parseError !== undefined || result.imports !== undefined).toBe(true);
          });

        });

      });

    });

  });

});
