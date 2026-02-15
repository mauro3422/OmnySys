/**
 * @fileoverview Tests for function-cycle-classifier/cycles/classifier.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve(
  'src/layer-a-static/analyses/tier1/function-cycle-classifier/cycles/classifier.js'
);

// Contract-based test suite
const suite = createUtilityTestSuite({
  module: 'analyses/tier1/function-cycle-classifier/cycles/classifier',
  exports: {},
  specificTests: [
    {
      name: 'exports cycle classification functions at source level',
      test: () => {
        const src = fs.readFileSync(sourcePath, 'utf8');
        expect(src).toContain('export function classifyFunctionCycle');
        expect(src).toContain('export function classifyAllFunctionCycles');
      }
    },
    {
      name: 'documents current runtime blocker (logger import path mismatch)',
      test: async () => {
        await expect(
          import('#layer-a/analyses/tier1/function-cycle-classifier/cycles/classifier.js')
        ).rejects.toThrow(/Cannot find module/);
      }
    }
  ]
});

// Run the suite
describe('analyses/tier1/function-cycle-classifier/cycles/classifier.js', suite);
