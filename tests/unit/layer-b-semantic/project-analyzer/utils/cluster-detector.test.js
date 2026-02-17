import { describe, it, expect, beforeEach } from 'vitest';
import { detectClusters, findCommonDirectory } from '#layer-b/project-analyzer/utils/cluster-detector.js';
import { COHESION_THRESHOLDS } from '#layer-b/project-analyzer/constants.js';

describe('cluster-detector', () => {
  describe('detectClusters', () => {
    it('should return empty array when given empty cohesion matrix', () => {
      const cohesionMatrix = new Map();
      const clusters = detectClusters(cohesionMatrix);
      expect(clusters).toEqual([]);
    });

    it('should return single file as cluster when only one file exists', () => {
      const cohesionMatrix = new Map([
        ['/src/utils/helper.js', new Map()]
      ]);
      const clusters = detectClusters(cohesionMatrix);
      expect(clusters).toHaveLength(1);
      expect(clusters[0].files).toContain('/src/utils/helper.js');
    });

    it('should detect cluster of files with high cohesion', () => {
      const cohesionMatrix = new Map([
        ['/src/components/Button.js', new Map([
          ['/src/components/Input.js', 5],
          ['/src/components/Form.js', 3]
        ])],
        ['/src/components/Input.js', new Map([
          ['/src/components/Button.js', 5],
          ['/src/components/Form.js', 4]
        ])],
        ['/src/components/Form.js', new Map([
          ['/src/components/Button.js', 3],
          ['/src/components/Input.js', 4]
        ])],
        ['/src/utils/unrelated.js', new Map()]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      
      const componentCluster = clusters.find(c => 
        c.files.includes('/src/components/Button.js')
      );
      expect(componentCluster).toBeDefined();
      expect(componentCluster.files).toHaveLength(3);
    });

    it('should separate unrelated files into different clusters', () => {
      const cohesionMatrix = new Map([
        ['/src/moduleA/file1.js', new Map([
          ['/src/moduleA/file2.js', 6]
        ])],
        ['/src/moduleA/file2.js', new Map([
          ['/src/moduleA/file1.js', 6]
        ])],
        ['/src/moduleB/file1.js', new Map([
          ['/src/moduleB/file2.js', 5]
        ])],
        ['/src/moduleB/file2.js', new Map([
          ['/src/moduleB/file1.js', 5]
        ])]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      
      expect(clusters).toHaveLength(2);
      expect(clusters[0].fileCount).toBe(2);
      expect(clusters[1].fileCount).toBe(2);
    });

    it('should use custom minCohesion threshold', () => {
      const cohesionMatrix = new Map([
        ['/src/fileA.js', new Map([
          ['/src/fileB.js', 0.5]
        ])],
        ['/src/fileB.js', new Map([
          ['/src/fileA.js', 0.5]
        ])]
      ]);
      
      const clustersWithDefault = detectClusters(cohesionMatrix, COHESION_THRESHOLDS.MIN_FOR_CLUSTER);
      const clustersWithLower = detectClusters(cohesionMatrix, 0.3);
      
      expect(clustersWithDefault).toHaveLength(2);
      expect(clustersWithLower).toHaveLength(1);
    });

    it('should calculate cluster cohesion correctly', () => {
      const cohesionMatrix = new Map([
        ['/src/components/A.js', new Map([
          ['/src/components/B.js', 6]
        ])],
        ['/src/components/B.js', new Map([
          ['/src/components/A.js', 6]
        ])]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      
      expect(clusters[0].cohesion).toBe(6);
    });

    it('should assign cluster name based on common directory', () => {
      const cohesionMatrix = new Map([
        ['/src/components/Button.js', new Map([
          ['/src/components/Input.js', 5]
        ])],
        ['/src/components/Input.js', new Map([
          ['/src/components/Button.js', 5]
        ])]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      
      expect(clusters[0].name).toBe('components');
      expect(clusters[0].commonDirectory).toContain('components');
    });

    it('should sort clusters by cohesion (highest first)', () => {
      const cohesionMatrix = new Map([
        ['/src/tight/T1.js', new Map([
          ['/src/tight/T2.js', 10]
        ])],
        ['/src/tight/T2.js', new Map([
          ['/src/tight/T1.js', 10]
        ])],
        ['/src/loose/L1.js', new Map([
          ['/src/loose/L2.js', 2]
        ])],
        ['/src/loose/L2.js', new Map([
          ['/src/loose/L1.js', 2]
        ])]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      
      expect(clusters[0].cohesion).toBeGreaterThan(clusters[1].cohesion);
    });

    it('should handle files with no connections', () => {
      const cohesionMatrix = new Map([
        ['/src/orphan.js', new Map()],
        ['/src/utils/helper.js', new Map()]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      
      expect(clusters).toHaveLength(2);
    });

    it('should handle complex multi-file clusters', () => {
      const cohesionMatrix = new Map([
        ['/src/app/Main.js', new Map([
          ['/src/app/Config.js', 5],
          ['/src/app/Logger.js', 4]
        ])],
        ['/src/app/Config.js', new Map([
          ['/src/app/Main.js', 5],
          ['/src/app/Logger.js', 3]
        ])],
        ['/src/app/Logger.js', new Map([
          ['/src/app/Main.js', 4],
          ['/src/app/Config.js', 3]
        ])]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      
      expect(clusters).toHaveLength(1);
      expect(clusters[0].files).toHaveLength(3);
      expect(clusters[0].fileCount).toBe(3);
    });

    it('should handle files with missing connections in matrix', () => {
      const cohesionMatrix = new Map([
        ['/src/A.js', new Map([
          ['/src/B.js', 3]
        ])],
        ['/src/B.js', new Map()]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      
      expect(clusters.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle negative cohesion values gracefully', () => {
      const cohesionMatrix = new Map([
        ['/src/file1.js', new Map([
          ['/src/file2.js', -1]
        ])],
        ['/src/file2.js', new Map([
          ['/src/file1.js', -1]
        ])]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      
      expect(clusters).toHaveLength(2);
    });
  });

  describe('findCommonDirectory', () => {
    it('should return empty string for empty array', () => {
      const result = findCommonDirectory([]);
      expect(result).toBe('');
    });

    it('should return directory of single file', () => {
      const result = findCommonDirectory(['/src/utils/helper.js']);
      expect(result).toBe('/src/utils');
    });

    it('should find common directory for files in same folder', () => {
      const result = findCommonDirectory([
        '/src/components/Button.js',
        '/src/components/Input.js',
        '/src/components/Form.js'
      ]);
      expect(result).toBe('/src/components');
    });

    it('should find common parent directory', () => {
      const result = findCommonDirectory([
        '/src/components/Button.js',
        '/src/utils/helper.js'
      ]);
      expect(result).toBe('/src');
    });

    it('should return root for files in different roots', () => {
      const result = findCommonDirectory([
        '/src/components/Button.js',
        '/lib/utils/helper.js'
      ]);
      expect(result).toBe('');
    });

    it('should handle files with same name in different directories', () => {
      const result = findCommonDirectory([
        '/src/index.js',
        '/lib/index.js'
      ]);
      expect(result).toBe('');
    });

    it('should handle deeply nested files', () => {
      const result = findCommonDirectory([
        '/src/a/b/c/d/File1.js',
        '/src/a/b/c/e/File2.js',
        '/src/a/b/f/File3.js'
      ]);
      expect(result).toContain('/src/a/b');
    });

    it('should handle Windows-style paths', () => {
      const result = findCommonDirectory([
        'C:\\src\\components\\Button.js',
        'C:\\src\\components\\Input.js'
      ]);
      expect(result).toContain('components');
    });
  });

  describe('cluster info structure', () => {
    it('should include all required properties in cluster info', () => {
      const cohesionMatrix = new Map([
        ['/src/components/A.js', new Map([
          ['/src/components/B.js', 5]
        ])],
        ['/src/components/B.js', new Map([
          ['/src/components/A.js', 5]
        ])]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      const cluster = clusters[0];
      
      expect(cluster).toHaveProperty('name');
      expect(cluster).toHaveProperty('files');
      expect(cluster).toHaveProperty('cohesion');
      expect(cluster).toHaveProperty('commonDirectory');
      expect(cluster).toHaveProperty('fileCount');
    });

    it('should handle cluster at root level', () => {
      const cohesionMatrix = new Map([
        ['/file1.js', new Map([
          ['/file2.js', 3]
        ])],
        ['/file2.js', new Map([
          ['/file1.js', 3]
        ])]
      ]);
      
      const clusters = detectClusters(cohesionMatrix);
      
      expect(clusters[0].name).toBe('root');
    });
  });
});
