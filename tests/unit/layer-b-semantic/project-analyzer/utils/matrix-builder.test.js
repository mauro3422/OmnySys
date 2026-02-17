import { describe, it, expect } from 'vitest';
import {
  calculateCohesionMatrix,
  getMostCohesiveFiles,
  calculateMatrixStats
} from '#layer-b/project-analyzer/utils/matrix-builder.js';

describe('matrix-builder', () => {
  describe('calculateCohesionMatrix', () => {
    it('should return empty matrix for empty files object', () => {
      const staticResults = { files: {} };
      const matrix = calculateCohesionMatrix(staticResults);
      expect(matrix).toBeInstanceOf(Map);
      expect(matrix.size).toBe(0);
    });

    it('should return empty matrix when files is undefined', () => {
      const staticResults = {};
      const matrix = calculateCohesionMatrix(staticResults);
      expect(matrix.size).toBe(0);
    });

    it('should create matrix entry for each file', () => {
      const staticResults = {
        files: {
          '/src/a.js': { imports: [], usedBy: [] },
          '/src/b.js': { imports: [], usedBy: [] },
          '/src/c.js': { imports: [], usedBy: [] }
        }
      };
      
      const matrix = calculateCohesionMatrix(staticResults);
      
      expect(matrix.size).toBe(3);
      expect(matrix.has('/src/a.js')).toBe(true);
      expect(matrix.has('/src/b.js')).toBe(true);
      expect(matrix.has('/src/c.js')).toBe(true);
    });

    it('should not include self-connections', () => {
      const staticResults = {
        files: {
          '/src/a.js': { imports: [], usedBy: [] },
          '/src/b.js': { imports: [], usedBy: [] }
        }
      };
      
      const matrix = calculateCohesionMatrix(staticResults);
      
      const aConnections = matrix.get('/src/a.js');
      expect(aConnections.has('/src/a.js')).toBe(false);
    });

    it('should calculate cohesion for file pairs', () => {
      const staticResults = {
        files: {
          '/src/components/Button.js': { 
            imports: [{ resolvedPath: '/src/components/Input.js' }],
            usedBy: []
          },
          '/src/components/Input.js': { 
            imports: [],
            usedBy: [{ resolvedPath: '/src/components/Button.js' }]
          }
        }
      };
      
      const matrix = calculateCohesionMatrix(staticResults);
      
      const buttonConnections = matrix.get('/src/components/Button.js');
      expect(buttonConnections.get('/src/components/Input.js')).toBeGreaterThan(0);
    });

    it('should only include positive cohesion values', () => {
      const staticResults = {
        files: {
          '/src/a.js': { imports: [], usedBy: [], semanticAnalysis: {} },
          '/src/b.js': { imports: [], usedBy: [], semanticAnalysis: {} }
        }
      };
      
      const matrix = calculateCohesionMatrix(staticResults);
      
      const aConnections = matrix.get('/src/a.js');
      const bConnections = matrix.get('/src/b.js');
      
      for (const cohesion of aConnections.values()) {
        expect(cohesion).toBeGreaterThan(0);
      }
      for (const cohesion of bConnections.values()) {
        expect(cohesion).toBeGreaterThan(0);
      }
    });

    it('should handle files with complex import structures', () => {
      const staticResults = {
        files: {
          '/src/app/Main.js': {
            imports: [
              { resolvedPath: '/src/app/Config.js' },
              { resolvedPath: '/src/app/Logger.js' }
            ],
            usedBy: [],
            semanticAnalysis: {
              sharedState: { reads: ['config'], writes: [] },
              eventPatterns: { eventEmitters: [], eventListeners: [] }
            }
          },
          '/src/app/Config.js': {
            imports: [],
            usedBy: [{ resolvedPath: '/src/app/Main.js' }],
            semanticAnalysis: {
              sharedState: { reads: [], writes: ['config'] },
              eventPatterns: { eventEmitters: [], eventListeners: [] }
            }
          },
          '/src/app/Logger.js': {
            imports: [],
            usedBy: [{ resolvedPath: '/src/app/Main.js' }],
            semanticAnalysis: {
              sharedState: { reads: [], writes: [] },
              eventPatterns: { eventEmitters: ['log'], eventListeners: [] }
            }
          }
        }
      };
      
      const matrix = calculateCohesionMatrix(staticResults);
      
      expect(matrix.size).toBe(3);
      const mainConnections = matrix.get('/src/app/Main.js');
      expect(mainConnections.size).toBe(2);
    });
  });

  describe('getMostCohesiveFiles', () => {
    it('should return empty array for unknown file', () => {
      const matrix = new Map([
        ['/src/a.js', new Map([['/src/b.js', 5]])]
      ]);
      
      const result = getMostCohesiveFiles('/src/unknown.js', matrix);
      expect(result).toEqual([]);
    });

    it('should return empty array for file with no connections', () => {
      const matrix = new Map([
        ['/src/a.js', new Map()]
      ]);
      
      const result = getMostCohesiveFiles('/src/a.js', matrix);
      expect(result).toEqual([]);
    });

    it('should return files sorted by cohesion descending', () => {
      const matrix = new Map([
        ['/src/a.js', new Map([
          ['/src/b.js', 2],
          ['/src/c.js', 5],
          ['/src/d.js', 1]
        ])]
      ]);
      
      const result = getMostCohesiveFiles('/src/a.js', matrix);
      
      expect(result[0].file).toBe('/src/c.js');
      expect(result[0].cohesion).toBe(5);
      expect(result[1].file).toBe('/src/b.js');
      expect(result[1].cohesion).toBe(2);
      expect(result[2].file).toBe('/src/d.js');
      expect(result[2].cohesion).toBe(1);
    });

    it('should respect limit parameter', () => {
      const matrix = new Map([
        ['/src/a.js', new Map([
          ['/src/b.js', 1],
          ['/src/c.js', 2],
          ['/src/d.js', 3],
          ['/src/e.js', 4],
          ['/src/f.js', 5]
        ])]
      ]);
      
      const limited = getMostCohesiveFiles('/src/a.js', matrix, 3);
      
      expect(limited).toHaveLength(3);
      expect(limited[0].file).toBe('/src/f.js');
    });

    it('should default limit to 5', () => {
      const entries = {};
      for (let i = 1; i <= 10; i++) {
        entries[`/src/file${i}.js`] = i;
      }
      
      const matrix = new Map([
        ['/src/a.js', new Map(Object.entries(entries))]
      ]);
      
      const result = getMostCohesiveFiles('/src/a.js', matrix);
      
      expect(result).toHaveLength(5);
    });

    it('should return array of objects with file and cohesion properties', () => {
      const matrix = new Map([
        ['/src/a.js', new Map([['/src/b.js', 3]])]
      ]);
      
      const result = getMostCohesiveFiles('/src/a.js', matrix);
      
      expect(result[0]).toHaveProperty('file');
      expect(result[0]).toHaveProperty('cohesion');
      expect(result[0].file).toBe('/src/b.js');
      expect(result[0].cohesion).toBe(3);
    });
  });

  describe('calculateMatrixStats', () => {
    it('should return zeros for empty matrix', () => {
      const matrix = new Map();
      const stats = calculateMatrixStats(matrix);
      
      expect(stats.totalConnections).toBe(0);
      expect(stats.averageCohesion).toBe(0);
      expect(stats.maxCohesion).toBe(0);
      expect(stats.minCohesion).toBe(0);
    });

    it('should calculate total connections correctly', () => {
      const matrix = new Map([
        ['/src/a.js', new Map([
          ['/src/b.js', 3],
          ['/src/c.js', 2]
        ])],
        ['/src/b.js', new Map([
          ['/src/a.js', 3]
        ])],
        ['/src/c.js', new Map([
          ['/src/a.js', 2]
        ])]
      ]);
      
      const stats = calculateMatrixStats(matrix);
      
      expect(stats.totalConnections).toBe(4);
    });

    it('should calculate average cohesion correctly', () => {
      const matrix = new Map([
        ['/src/a.js', new Map([
          ['/src/b.js', 2],
          ['/src/c.js', 4]
        ])],
        ['/src/b.js', new Map([
          ['/src/a.js', 2]
        ])],
        ['/src/c.js', new Map([
          ['/src/a.js', 4]
        ])]
      ]);
      
      const stats = calculateMatrixStats(matrix);
      
      expect(stats.averageCohesion).toBe(3);
    });

    it('should identify max and min cohesion', () => {
      const matrix = new Map([
        ['/src/a.js', new Map([
          ['/src/b.js', 10],
          ['/src/c.js', 1]
        ])],
        ['/src/b.js', new Map([
          ['/src/a.js', 10]
        ])],
        ['/src/c.js', new Map([
          ['/src/a.js', 1]
        ])]
      ]);
      
      const stats = calculateMatrixStats(matrix);
      
      expect(stats.maxCohesion).toBe(10);
      expect(stats.minCohesion).toBe(1);
    });

    it('should handle single connection', () => {
      const matrix = new Map([
        ['/src/a.js', new Map([
          ['/src/b.js', 5]
        ])]
      ]);
      
      const stats = calculateMatrixStats(matrix);
      
      expect(stats.totalConnections).toBe(1);
      expect(stats.averageCohesion).toBe(5);
      expect(stats.maxCohesion).toBe(5);
      expect(stats.minCohesion).toBe(5);
    });

    it('should handle files with no connections in matrix', () => {
      const matrix = new Map([
        ['/src/a.js', new Map()],
        ['/src/b.js', new Map()]
      ]);
      
      const stats = calculateMatrixStats(matrix);
      
      expect(stats.totalConnections).toBe(0);
      expect(stats.averageCohesion).toBe(0);
    });

    it('should return correct stats object structure', () => {
      const matrix = new Map([
        ['/src/a.js', new Map([['/src/b.js', 3]])]
      ]);
      
      const stats = calculateMatrixStats(matrix);
      
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('averageCohesion');
      expect(stats).toHaveProperty('maxCohesion');
      expect(stats).toHaveProperty('minCohesion');
    });
  });
});
