/**
 * @fileoverview Tests for function-cycle-classifier/extractors/metadata-extractor.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import {
  extractFunctionMetadata,
  extractCycleMetadata
} from '#layer-a/analyses/tier1/function-cycle-classifier/extractors/metadata-extractor.js';

// Contract-based test suite
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/function-cycle-classifier/extractors/metadata-extractor',
  exports: { extractFunctionMetadata, extractCycleMetadata },
  specificTests: [
    {
      name: 'extracts normalized metadata fields from an atom',
      test: () => {
        const out = extractFunctionMetadata({ name: 'fn', complexity: 3, isAsync: true });
        expect(out.name).toBe('fn');
        expect(out.complexity).toBe(3);
        expect(out.isAsync).toBe(true);
        expect(out.calls).toEqual([]);
      }
    },
    {
      name: 'extracts metadata map for functions present in cycle',
      test: () => {
        const cycle = ['src/a.js::fnA'];
        const atomsIndex = {
          'src/a.js': { atoms: [{ name: 'fnA', complexity: 2 }] }
        };
        const out = extractCycleMetadata(cycle, atomsIndex);
        expect(out['src/a.js::fnA']).toBeDefined();
      }
    },
    {
      name: 'handles missing atom properties with defaults',
      test: () => {
        const out = extractFunctionMetadata({ name: 'fn' });
        expect(out.name).toBe('fn');
        expect(out.complexity).toBe(0);
        expect(out.isAsync).toBe(false);
        expect(out.calls).toEqual([]);
      }
    },
    {
      name: 'handles empty cycle gracefully',
      test: () => {
        const out = extractCycleMetadata([], {});
        expect(out).toEqual({});
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier/extractors/metadata-extractor.js', suite);
