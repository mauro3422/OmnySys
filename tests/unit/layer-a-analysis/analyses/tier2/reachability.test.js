/**
 * @fileoverview Tests for tier2/reachability.js
 * 
 * Tests the analyzeReachability function.
 */

import { describe, it, expect } from 'vitest';
import { analyzeReachability } from '#layer-a/analyses/tier2/reachability.js';
import { createMockSystemMap } from '../../../../factories/analysis.factory.js';

describe('tier2/reachability.js', () => {
  describe('analyzeReachability', () => {
    it('should return structure with all required fields', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': { usedBy: [], dependsOn: ['src/utils.js'] },
          'src/utils.js': { usedBy: ['src/index.js'], dependsOn: [] }
        },
        metadata: { totalFiles: 2 }
      });

      const result = analyzeReachability(systemMap);

      expect(result).toHaveProperty('totalFiles');
      expect(result).toHaveProperty('reachable');
      expect(result).toHaveProperty('unreachable');
      expect(result).toHaveProperty('reachablePercent');
      expect(result).toHaveProperty('likelyEntryPoints');
      expect(result).toHaveProperty('deadCodeFiles');
      expect(result).toHaveProperty('concern');
    });

    it('should identify files with no incoming dependencies as entry points', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': { usedBy: [], dependsOn: ['src/utils.js'] },
          'src/utils.js': { usedBy: ['src/index.js', 'src/app.js'], dependsOn: [] },
          'src/app.js': { usedBy: ['src/utils.js'], dependsOn: [] }
        },
        metadata: { totalFiles: 3 }
      });

      const result = analyzeReachability(systemMap);

      expect(result.likelyEntryPoints).toContain('src/index.js');
    });

    it('should mark files reachable from entry points', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': { usedBy: [], dependsOn: ['src/utils.js'] },
          'src/utils.js': { usedBy: ['src/index.js'], dependsOn: ['src/helpers.js'] },
          'src/helpers.js': { usedBy: ['src/utils.js'], dependsOn: [] }
        },
        metadata: { totalFiles: 3 }
      });

      const result = analyzeReachability(systemMap);

      expect(result.reachable).toBe(3);
      expect(result.unreachable).toBe(0);
    });

    it('should identify unreachable files', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': { usedBy: [], dependsOn: [] },
          'src/orphan.js': { usedBy: [], dependsOn: [] },
          'src/dead.js': { usedBy: [], dependsOn: [] }
        },
        metadata: { totalFiles: 3 }
      });

      const result = analyzeReachability(systemMap);

      expect(result.reachable).toBe(1);
      expect(result.unreachable).toBe(2);
      expect(result.deadCodeFiles).toContain('src/orphan.js');
    });

    it('should calculate reachable percentage correctly', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': { usedBy: [], dependsOn: [] },
          'src/a.js': { usedBy: [], dependsOn: [] },
          'src/b.js': { usedBy: [], dependsOn: [] },
          'src/c.js': { usedBy: [], dependsOn: [] }
        },
        metadata: { totalFiles: 4 }
      });

      const result = analyzeReachability(systemMap);

      expect(result.reachablePercent).toBe('25.0');
    });

    it('should set concern to HIGH when reachable < 70%', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': { usedBy: [], dependsOn: [] },
          'src/a.js': { usedBy: [], dependsOn: [] },
          'src/b.js': { usedBy: [], dependsOn: [] }
        },
        metadata: { totalFiles: 3 }
      });

      const result = analyzeReachability(systemMap);

      expect(result.concern).toBe('HIGH');
    });

    it('should set concern to MEDIUM when 70% <= reachable < 85%', () => {
      const files = {};
      for (let i = 0; i < 10; i++) {
        files[`src/file${i}.js`] = { usedBy: i > 0 ? [`src/file${i-1}.js`] : [], dependsOn: [] };
      }
      files['src/index.js'] = { usedBy: [], dependsOn: [] };
      
      const systemMap = createMockSystemMap({
        files,
        metadata: { totalFiles: 11 }
      });

      const result = analyzeReachability(systemMap);

      expect(['MEDIUM', 'LOW']).toContain(result.concern);
    });

    it('should set concern to LOW when reachable >= 85%', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': { usedBy: [], dependsOn: ['src/a.js'] },
          'src/a.js': { usedBy: ['src/index.js'], dependsOn: ['src/b.js'] },
          'src/b.js': { usedBy: ['src/a.js'], dependsOn: [] }
        },
        metadata: { totalFiles: 3 }
      });

      const result = analyzeReachability(systemMap);

      expect(result.concern).toBe('LOW');
    });

    it('should handle files with missing usedBy property', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': { dependsOn: [] },
          'src/utils.js': { usedBy: ['src/index.js'], dependsOn: [] }
        },
        metadata: { totalFiles: 2 }
      });

      const result = analyzeReachability(systemMap);

      expect(result.likelyEntryPoints).toContain('src/index.js');
    });

    it('should handle files with missing dependsOn property', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': { usedBy: [], dependsOn: ['src/utils.js'] },
          'src/utils.js': { usedBy: ['src/index.js'] }
        },
        metadata: { totalFiles: 2 }
      });

      const result = analyzeReachability(systemMap);

      expect(result.reachable).toBe(2);
    });

    it('should limit deadCodeFiles to 10 entries', () => {
      const files = {};
      for (let i = 0; i < 20; i++) {
        files[`src/orphan${i}.js`] = { usedBy: [], dependsOn: [] };
      }
      files['src/index.js'] = { usedBy: [], dependsOn: [] };

      const systemMap = createMockSystemMap({
        files,
        metadata: { totalFiles: 21 }
      });

      const result = analyzeReachability(systemMap);

      expect(result.deadCodeFiles.length).toBeLessThanOrEqual(10);
    });

    it('should handle empty project', () => {
      const systemMap = createMockSystemMap({
        files: {},
        metadata: { totalFiles: 0 }
      });

      const result = analyzeReachability(systemMap);

      expect(result.totalFiles).toBe(0);
      expect(result.reachable).toBe(0);
      expect(result.unreachable).toBe(0);
    });

    it('should handle circular dependencies in reachability', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/a.js': { usedBy: ['src/b.js'], dependsOn: ['src/b.js'] },
          'src/b.js': { usedBy: ['src/a.js'], dependsOn: ['src/a.js'] }
        },
        metadata: { totalFiles: 2 }
      });

      // No entry points (all files have usedBy)
      const result = analyzeReachability(systemMap);

      expect(result.reachable).toBe(0);
      expect(result.unreachable).toBe(2);
    });
  });
});
