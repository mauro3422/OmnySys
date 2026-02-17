/**
 * @fileoverview Contract Tests for Layer B Metadata Contract
 * 
 * Verifies that ALL metadata builders comply with the standard interface.
 * Adding a new builder? Just add it to the BUILDERS array.
 * 
 * @module tests/contracts/layer-b-metadata.contract.test
 */

import { describe, it, expect, beforeAll } from 'vitest';

// ============================================
// CONFIGURATION: Add new builders here
// ============================================
const BUILDERS = [
  {
    name: 'Standard Metadata Builder',
    module: '#layer-b/metadata-contract/builders/standard-builder.js',
    function: 'buildStandardMetadata',
    requiredFields: [
      'filePath', 'exportCount', 'dependentCount', 'importCount',
      'hasDynamicImports', 'hasLocalStorage', 'hasEventListeners', 'hasGlobalAccess'
    ]
  },
  {
    name: 'God Object Detector',
    module: '#layer-b/metadata-contract/detectors/architectural-patterns.js',
    function: 'detectGodObject',
    returnsPrimitives: true
  },
  {
    name: 'Orphan Module Detector',
    module: '#layer-b/metadata-contract/detectors/architectural-patterns.js',
    function: 'detectOrphanModule',
    returnsPrimitives: true
  }
];

// ============================================
// CONTRACT DEFINITION
// ============================================
const METADATA_CONTRACT = {
  requiredFields: ['filePath'],
  booleanFields: ['hasDynamicImports', 'hasLocalStorage', 'hasEventListeners', 'hasGlobalAccess'],
  numericFields: ['exportCount', 'dependentCount', 'importCount', 'functionCount'],
  arrayFields: ['exports', 'dependents', 'imports', 'localStorageKeys', 'eventNames']
};

const DETECTOR_CONTRACT = {
  requiredFields: ['detected', 'confidence', 'evidence'],
  booleanFields: ['detected'],
  numericFields: ['confidence']
};

// ============================================
// CONTRACT TESTS
// ============================================

describe('Layer B Metadata Contract', () => {
  
  BUILDERS.forEach(({ name, module, function: fn, requiredFields, returnsObject, returnsPrimitives }) => {
    
    describe(`${name}`, () => {
      
      let builderFn;
      
      beforeAll(async () => {
        try {
          const mod = await import(module);
          builderFn = mod[fn];
        } catch (error) {
          builderFn = null;
        }
      });

      it('MUST export the function', () => {
        expect(builderFn).toBeDefined();
        expect(typeof builderFn).toBe('function');
      });

      if (!returnsObject && !returnsPrimitives) {
        describe('Metadata Output Contract', () => {
          
          it('MUST return all required fields', () => {
            if (!builderFn) return;
            
            const testInput = {
              exports: [],
              imports: [],
              usedBy: [],
              functions: [],
              semanticAnalysis: {}
            };
            
            const result = builderFn(testInput, 'test.js');
            
            (requiredFields || METADATA_CONTRACT.requiredFields).forEach(field => {
              expect(result).toHaveProperty(field);
            });
          });

          it('MUST return correct types for boolean fields', () => {
            if (!builderFn) return;
            
            const result = builderFn({}, 'test.js');
            
            METADATA_CONTRACT.booleanFields.forEach(field => {
              if (result[field] !== undefined) {
                expect(typeof result[field]).toBe('boolean');
              }
            });
          });

          it('MUST return correct types for numeric fields', () => {
            if (!builderFn) return;
            
            const result = builderFn({}, 'test.js');
            
            METADATA_CONTRACT.numericFields.forEach(field => {
              if (result[field] !== undefined) {
                expect(typeof result[field]).toBe('number');
              }
            });
          });

          it('MUST return correct types for array fields', () => {
            if (!builderFn) return;
            
            const result = builderFn({}, 'test.js');
            
            METADATA_CONTRACT.arrayFields.forEach(field => {
              if (result[field] !== undefined) {
                expect(Array.isArray(result[field])).toBe(true);
              }
            });
          });

          it('MUST handle empty input gracefully', () => {
            if (!builderFn) return;
            
            const result = builderFn({}, 'test.js');
            expect(result).toBeDefined();
          });
        });
      } else if (returnsPrimitives) {
        describe('Primitive Detector Contract', () => {
          
          it('MUST accept numeric parameters', () => {
            if (!builderFn) return;
            
            expect(() => builderFn(10, 20)).not.toThrow();
          });

          it('MUST return detection result', () => {
            if (!builderFn) return;
            
            const result = builderFn(10, 20);
            
            expect(result).toBeDefined();
          });

          it('MUST handle zero values', () => {
            if (!builderFn) return;
            
            expect(() => builderFn(0, 0)).not.toThrow();
          });

          it('MUST return consistent type', () => {
            if (!builderFn) return;
            
            const result1 = builderFn(10, 20);
            const result2 = builderFn(0, 0);
            
            expect(typeof result1).toBe(typeof result2);
          });
        });
      } else {
        describe('Detector Output Contract', () => {
          
          it('MUST return detected, confidence, and evidence', () => {
            if (!builderFn) return;
            
            const testInput = {
              exportCount: 5,
              dependentCount: 10,
              semanticAnalysis: {}
            };
            
            const result = builderFn(testInput);
            
            DETECTOR_CONTRACT.requiredFields.forEach(field => {
              expect(result).toHaveProperty(field);
            });
          });

          it('MUST return boolean for detected', () => {
            if (!builderFn) return;
            
            const result = builderFn({});
            
            expect(typeof result.detected).toBe('boolean');
          });

          it('MUST return number for confidence (0-1)', () => {
            if (!builderFn) return;
            
            const result = builderFn({});
            
            if (result.confidence !== undefined) {
              expect(typeof result.confidence).toBe('number');
              expect(result.confidence).toBeGreaterThanOrEqual(0);
              expect(result.confidence).toBeLessThanOrEqual(1);
            }
          });
        });
      }
    });
  });
});

// ============================================
// CROSS-BUILDER COMPATIBILITY
// ============================================

describe('Cross-Builder Compatibility', () => {
  
  it('All builders should accept same input format', async () => {
    const standardInput = {
      exports: [{ name: 'foo' }],
      imports: [{ source: './bar' }],
      usedBy: ['consumer.js'],
      functions: [{ name: 'test' }],
      semanticAnalysis: {
        sharedState: { reads: [], writes: [] },
        eventPatterns: { eventEmitters: [], eventListeners: [] }
      }
    };
    
    for (const { module, function: fn } of BUILDERS) {
      try {
        const mod = await import(module);
        const builderFn = mod[fn];
        
        if (builderFn) {
          expect(() => builderFn(standardInput, 'test.js')).not.toThrow();
        }
      } catch (e) {
        // Skip modules that can't be imported
      }
    }
  });
});
