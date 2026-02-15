/**
 * @fileoverview Tests for deep-chains.js
 */

import { describe, it, expect } from 'vitest';
import { findDeepDependencyChains } from '#layer-a/analyses/tier1/deep-chains.js';
import { SystemMapBuilder } from '../../../../factories/root-infrastructure-test.factory.js';

describe('deep-chains.js', () => {
  describe('findDeepDependencyChains', () => {
    it('should return empty result for empty systemMap', () => {
      const systemMap = SystemMapBuilder.create().build();
      
      const result = findDeepDependencyChains(systemMap);
      
      expect(result.totalDeepChains).toBe(0);
      expect(result.chains).toHaveLength(0);
      expect(result.maxDepth).toBe(0);
    });

    it('should not report chains shorter than 5', () => {
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
      
      const result = findDeepDependencyChains(systemMap);
      
      expect(result.totalDeepChains).toBe(0);
    });

    it('should detect chains with depth >= 5', () => {
      const systemMap = SystemMapBuilder.create();
      
      // Create chain: a -> b -> c -> d -> e
      const files = ['a', 'b', 'c', 'd', 'e'];
      files.forEach((f, i) => {
        systemMap.withFile(`src/${f}.js`);
        systemMap.withFunction(`src/${f}.js`, f);
        if (i > 0) {
          systemMap.withFunctionLink(
            `src/${files[i-1]}.js:${files[i-1]}`,
            `src/${f}.js:${f}`
          );
        }
      });
      
      const result = findDeepDependencyChains(systemMap.build());
      
      expect(result.totalDeepChains).toBeGreaterThan(0);
    });

    it('should return maxDepth of detected chains', () => {
      const systemMap = SystemMapBuilder.create();
      
      // Create chain: a -> b -> c -> d -> e -> f
      const files = ['a', 'b', 'c', 'd', 'e', 'f'];
      files.forEach((f, i) => {
        systemMap.withFile(`src/${f}.js`);
        systemMap.withFunction(`src/${f}.js`, f);
        if (i > 0) {
          systemMap.withFunctionLink(
            `src/${files[i-1]}.js:${files[i-1]}`,
            `src/${f}.js:${f}`
          );
        }
      });
      
      const result = findDeepDependencyChains(systemMap.build());
      
      expect(result.maxDepth).toBeGreaterThanOrEqual(5);
    });

    it('should limit chains to top 10', () => {
      const systemMap = SystemMapBuilder.create();
      
      // Create multiple entry points with deep chains
      for (let entry = 0; entry < 5; entry++) {
        const files = Array.from({ length: 8 }, (_, i) => `entry${entry}_f${i}`);
        files.forEach((f, i) => {
          systemMap.withFile(`src/${f}.js`);
          systemMap.withFunction(`src/${f}.js`, f);
          if (i > 0) {
            systemMap.withFunctionLink(
              `src/${files[i-1]}.js:${files[i-1]}`,
              `src/${f}.js:${f}`
            );
          }
        });
      }
      
      const result = findDeepDependencyChains(systemMap.build());
      
      expect(result.chains.length).toBeLessThanOrEqual(10);
    });

    it('should sort chains by depth descending', () => {
      const systemMap = SystemMapBuilder.create();
      
      // Create chains of different depths
      const depths = [6, 8, 5, 7];
      depths.forEach((depth, idx) => {
        const files = Array.from({ length: depth }, (_, i) => `chain${idx}_f${i}`);
        files.forEach((f, i) => {
          systemMap.withFile(`src/${f}.js`);
          systemMap.withFunction(`src/${f}.js`, f);
          if (i > 0) {
            systemMap.withFunctionLink(
              `src/${files[i-1]}.js:${files[i-1]}`,
              `src/${f}.js:${f}`
            );
          }
        });
      });
      
      const result = findDeepDependencyChains(systemMap.build());
      
      for (let i = 1; i < result.chains.length; i++) {
        expect(result.chains[i-1].depth).toBeGreaterThanOrEqual(result.chains[i].depth);
      }
    });

    it('should include impact description in chains', () => {
      const systemMap = SystemMapBuilder.create();
      
      const files = Array.from({ length: 6 }, (_, i) => `f${i}`);
      files.forEach((f, i) => {
        systemMap.withFile(`src/${f}.js`);
        systemMap.withFunction(`src/${f}.js`, f);
        if (i > 0) {
          systemMap.withFunctionLink(
            `src/${files[i-1]}.js:${files[i-1]}`,
            `src/${f}.js:${f}`
          );
        }
      });
      
      const result = findDeepDependencyChains(systemMap.build());
      
      if (result.chains.length > 0) {
        expect(result.chains[0].impact).toContain('Changing root function affects');
      }
    });

    it('should return recommendation text', () => {
      const systemMap = SystemMapBuilder.create().build();
      
      const result = findDeepDependencyChains(systemMap);
      
      expect(typeof result.recommendation).toBe('string');
    });

    it('should avoid revisiting nodes in a path', () => {
      const systemMap = SystemMapBuilder.create()
        .withFile('src/a.js')
        .withFile('src/b.js')
        .withFunction('src/a.js', 'a')
        .withFunction('src/b.js', 'b')
        .withFunctionLink('src/a.js:a', 'src/b.js:b')
        .withFunctionLink('src/b.js:b', 'src/a.js:a') // Cycle back
        .build();
      
      const result = findDeepDependencyChains(systemMap);
      
      // Should not get stuck in infinite loop
      expect(result).toBeDefined();
    });
  });
});
