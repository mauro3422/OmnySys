/**
 * @fileoverview Tests for deep-chains.js - Meta-Factory Pattern
 */

import { describe, it, expect } from 'vitest';
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { findDeepDependencyChains } from '#layer-a/analyses/tier1/deep-chains.js';
import { SystemMapBuilder } from '../../../../factories/root-infrastructure-test.factory.js';

// Contract-based test suite
const suite = createAnalysisTestSuite({
  module: 'analyses/tier1/deep-chains',
  exports: { findDeepDependencyChains },
  analyzeFn: findDeepDependencyChains,
  expectedFields: {
    totalDeepChains: 'number',
    maxDepth: 'number',
    chains: 'array',
    recommendation: 'string'
  },
  createMockInput: () => SystemMapBuilder.create().build(),
  specificTests: [
    {
      name: 'should not report chains shorter than 5',
      test: (analyzeFn) => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/a.js')
          .withFile('src/b.js')
          .withFile('src/c.js')
          .withFunction('src/a.js', 'a')
          .withFunction('src/b.js', 'b')
          .withFunction('src/c.js', 'c')
          .withFunctionLink('src/a.js:a', 'src/b.js:b')
          .withFunctionLink('src/b.js:b', 'src/c.js:c')
          .build();
        
        const result = analyzeFn(systemMap);
        expect(result.totalDeepChains).toBe(0);
      }
    },
    {
      name: 'should detect chains with depth >= 5',
      test: (analyzeFn) => {
        const builder = SystemMapBuilder.create();
        
        // Create chain: a -> b -> c -> d -> e
        const files = ['a', 'b', 'c', 'd', 'e'];
        files.forEach((f, i) => {
          builder.withFile(`src/${f}.js`);
          builder.withFunction(`src/${f}.js`, f);
          if (i > 0) {
            builder.withFunctionLink(
              `src/${files[i-1]}.js:${files[i-1]}`,
              `src/${f}.js:${f}`
            );
          }
        });
        
        const result = analyzeFn(builder.build());
        expect(result.totalDeepChains).toBeGreaterThan(0);
      }
    },
    {
      name: 'should return maxDepth of detected chains',
      test: (analyzeFn) => {
        const builder = SystemMapBuilder.create();
        
        // Create chain: a -> b -> c -> d -> e -> f
        const files = ['a', 'b', 'c', 'd', 'e', 'f'];
        files.forEach((f, i) => {
          builder.withFile(`src/${f}.js`);
          builder.withFunction(`src/${f}.js`, f);
          if (i > 0) {
            builder.withFunctionLink(
              `src/${files[i-1]}.js:${files[i-1]}`,
              `src/${f}.js:${f}`
            );
          }
        });
        
        const result = analyzeFn(builder.build());
        expect(result.maxDepth).toBeGreaterThanOrEqual(5);
      }
    },
    {
      name: 'should limit chains to top 10',
      test: (analyzeFn) => {
        const builder = SystemMapBuilder.create();
        
        // Create multiple entry points with deep chains
        for (let entry = 0; entry < 5; entry++) {
          const files = Array.from({ length: 8 }, (_, i) => `entry${entry}_f${i}`);
          files.forEach((f, i) => {
            builder.withFile(`src/${f}.js`);
            builder.withFunction(`src/${f}.js`, f);
            if (i > 0) {
              builder.withFunctionLink(
                `src/${files[i-1]}.js:${files[i-1]}`,
                `src/${f}.js:${f}`
              );
            }
          });
        }
        
        const result = analyzeFn(builder.build());
        expect(result.chains.length).toBeLessThanOrEqual(10);
      }
    },
    {
      name: 'should sort chains by depth descending',
      test: (analyzeFn) => {
        const builder = SystemMapBuilder.create();
        
        // Create chains of different depths
        const depths = [6, 8, 5, 7];
        depths.forEach((depth, idx) => {
          const files = Array.from({ length: depth }, (_, i) => `chain${idx}_f${i}`);
          files.forEach((f, i) => {
            builder.withFile(`src/${f}.js`);
            builder.withFunction(`src/${f}.js`, f);
            if (i > 0) {
              builder.withFunctionLink(
                `src/${files[i-1]}.js:${files[i-1]}`,
                `src/${f}.js:${f}`
              );
            }
          });
        });
        
        const result = analyzeFn(builder.build());
        
        for (let i = 1; i < result.chains.length; i++) {
          expect(result.chains[i-1].depth).toBeGreaterThanOrEqual(result.chains[i].depth);
        }
      }
    },
    {
      name: 'should include impact description in chains',
      test: (analyzeFn) => {
        const builder = SystemMapBuilder.create();
        
        const files = Array.from({ length: 6 }, (_, i) => `f${i}`);
        files.forEach((f, i) => {
          builder.withFile(`src/${f}.js`);
          builder.withFunction(`src/${f}.js`, f);
          if (i > 0) {
            builder.withFunctionLink(
              `src/${files[i-1]}.js:${files[i-1]}`,
              `src/${f}.js:${f}`
            );
          }
        });
        
        const result = analyzeFn(builder.build());
        
        if (result.chains.length > 0) {
          expect(result.chains[0].impact).toContain('Changing root function affects');
        }
      }
    },
    {
      name: 'should avoid revisiting nodes in a path',
      test: (analyzeFn) => {
        const systemMap = SystemMapBuilder.create()
          .withFile('src/a.js')
          .withFile('src/b.js')
          .withFunction('src/a.js', 'a')
          .withFunction('src/b.js', 'b')
          .withFunctionLink('src/a.js:a', 'src/b.js:b')
          .withFunctionLink('src/b.js:b', 'src/a.js:a') // Cycle back
          .build();
        
        const result = analyzeFn(systemMap);
        
        // Should not get stuck in infinite loop
        expect(result).toBeDefined();
      }
    }
  ]
});

// Run the suite
describe('deep-chains.js', suite);
