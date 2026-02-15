/**
 * @fileoverview Tests for function-cycle-classifier/utils/metadata.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import {
  extractFunctionMetadata,
  buildMetadataIndex
} from '#layer-a/analyses/tier1/function-cycle-classifier/utils/metadata.js';

// Contract-based test suite
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/function-cycle-classifier/utils/metadata',
  exports: { extractFunctionMetadata, buildMetadataIndex },
  specificTests: [
    {
      name: 'extracts normalized metadata defaults from atom',
      test: () => {
        const out = extractFunctionMetadata({ name: 'x' });
        expect(out.name).toBe('x');
        expect(out.complexity).toBe(0);
        expect(out.hasSideEffects).toBe(false);
      }
    },
    {
      name: 'builds metadata index for cycle function IDs',
      test: () => {
        const cycle = ['src/a.js::run'];
        const atomsIndex = {
          'src/a.js': { atoms: [{ name: 'run', complexity: 7 }] }
        };
        const out = buildMetadataIndex(cycle, atomsIndex);
        expect(out['src/a.js::run']).toBeDefined();
        expect(out['src/a.js::run'].complexity).toBe(7);
      }
    },
    {
      name: 'handles missing atom properties with defaults',
      test: () => {
        const out = extractFunctionMetadata({});
        expect(out.name).toBe('');
        expect(out.complexity).toBe(0);
        expect(out.hasSideEffects).toBe(false);
        expect(out.isAsync).toBe(false);
      }
    },
    {
      name: 'handles empty cycle in buildMetadataIndex',
      test: () => {
        const out = buildMetadataIndex([], {});
        expect(out).toEqual({});
      }
    },
    {
      name: 'preserves atom properties when available',
      test: () => {
        const out = extractFunctionMetadata({ 
          name: 'testFn', 
          complexity: 5, 
          isAsync: true, 
          hasSideEffects: true 
        });
        expect(out.name).toBe('testFn');
        expect(out.complexity).toBe(5);
        expect(out.isAsync).toBe(true);
        expect(out.hasSideEffects).toBe(true);
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier/utils/metadata.js', suite);
