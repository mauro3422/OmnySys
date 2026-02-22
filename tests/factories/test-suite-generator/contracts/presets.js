/**
 * @fileoverview Contract Presets - Predefined contract combinations for common patterns
 */

import { createStructureContract } from './structure-contract.js';
import { createErrorHandlingContract } from './error-handling-contract.js';
import { createReturnStructureContract } from './return-structure-contract.js';

/**
 * Predefined contract combinations for common patterns
 */
export const ContractPresets = {
  /**
   * Standard analysis function preset
   * Includes: Structure, Error Handling, Return Structure
   */
  analysis: ({ moduleName, analyzeFn, expectedFields, createMockInput }) => ({
    structure: (exports) => createStructureContract({ moduleName, exports, exportNames: [moduleName.split('/').pop()] }),
    errorHandling: () => createErrorHandlingContract({ 
      moduleName, 
      testFn: analyzeFn, 
      options: { async: true, expectedSafeResult: { total: 0 } }
    }),
    returnStructure: () => createReturnStructureContract({
      moduleName,
      testFn: analyzeFn,
      expectedStructure: { total: 'number', ...expectedFields },
      createValidInput: createMockInput
    })
  }),

  /**
   * Standard detector preset
   * Includes: Structure, Error Handling, Return Structure with findings
   */
  detector: ({ moduleName, detectorClass, createMockInput }) => ({
    structure: () => createStructureContract({ 
      moduleName, 
      exports: detectorClass, 
      exportNames: ['detect'] 
    }),
    errorHandling: () => createErrorHandlingContract({ 
      moduleName, 
      testFn: (input) => {
        const detector = new detectorClass();
        return detector.detect(input);
      },
      options: { async: true, expectedSafeResult: [] }
    }),
    returnStructure: () => createReturnStructureContract({
      moduleName,
      testFn: async (input) => {
        const detector = new detectorClass();
        return detector.detect(input);
      },
      expectedStructure: { /* findings array */ },
      createValidInput: createMockInput
    })
  }),

  /**
   * Simple utility function preset
   */
  utility: ({ moduleName, fn, expectedSafeResult }) => ({
    structure: (exports) => createStructureContract({ moduleName, exports }),
    errorHandling: () => createErrorHandlingContract({ 
      moduleName, 
      testFn: fn,
      options: { expectedSafeResult }
    })
  })
};
