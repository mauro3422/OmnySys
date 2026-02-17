import { describe, it, expect } from 'vitest';
import {
  identifyOrphans,
  hasSignificantSideEffects
} from '#layer-b/project-analyzer/utils/orphan-detector.js';
import { Severity } from '#layer-b/project-analyzer/constants.js';

describe('orphan-detector', () => {
  describe('identifyOrphans', () => {
    it('should return empty array when no files', () => {
      const staticResults = { files: {} };
      const cohesionMatrix = new Map();
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans).toEqual([]);
    });

    it('should return empty array when files is undefined', () => {
      const staticResults = {};
      const cohesionMatrix = new Map();
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans).toEqual([]);
    });

    it('should identify file with no imports and no dependents as orphan', () => {
      const staticResults = {
        files: {
          '/src/orphan.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {}
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/orphan.js', new Map()]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans).toHaveLength(1);
      expect(orphans[0].file).toBe('/src/orphan.js');
    });

    it('should not identify file with imports as orphan', () => {
      const staticResults = {
        files: {
          '/src/used.js': {
            imports: [{ resolvedPath: '/src/other.js' }],
            usedBy: [],
            semanticAnalysis: {}
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/used.js', new Map([['/src/other.js', 3]])]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans).toHaveLength(0);
    });

    it('should not identify file with dependents as orphan', () => {
      const staticResults = {
        files: {
          '/src/wanted.js': {
            imports: [],
            usedBy: [{ resolvedPath: '/src/consumer.js' }],
            semanticAnalysis: {}
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/wanted.js', new Map([['/src/consumer.js', 2]])]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans).toHaveLength(0);
    });

    it('should not identify file with high cohesion as orphan', () => {
      const staticResults = {
        files: {
          '/src/connected.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {}
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/connected.js', new Map([
          ['/src/a.js', 10],
          ['/src/b.js', 8]
        ])]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans).toHaveLength(0);
    });

    it('should identify multiple orphans', () => {
      const staticResults = {
        files: {
          '/src/orphan1.js': { imports: [], usedBy: [], semanticAnalysis: {} },
          '/src/orphan2.js': { imports: [], usedBy: [], semanticAnalysis: {} },
          '/src/normal.js': { imports: [{ resolvedPath: '/src/other.js' }], usedBy: [], semanticAnalysis: {} }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/orphan1.js', new Map()],
        ['/src/orphan2.js', new Map()],
        ['/src/normal.js', new Map([['/src/other.js', 3]])]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans).toHaveLength(2);
    });

    it('should include file path in orphan info', () => {
      const staticResults = {
        files: {
          '/src/utils/helper.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {}
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/utils/helper.js', new Map()]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans[0].file).toBe('/src/utils/helper.js');
    });

    it('should set HIGH severity for orphan with side effects', () => {
      const staticResults = {
        files: {
          '/src/side-effect.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {
              sharedState: { writes: ['globalState'] }
            }
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/side-effect.js', new Map()]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans[0].severity).toBe(Severity.HIGH);
    });

    it('should set LOW severity for orphan without side effects', () => {
      const staticResults = {
        files: {
          '/src/clean-orphan.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {}
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/clean-orphan.js', new Map()]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans[0].severity).toBe(Severity.LOW);
    });

    it('should include maxCohesion in orphan info', () => {
      const staticResults = {
        files: {
          '/src/low-cohesion.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {}
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/low-cohesion.js', new Map([['/src/a.js', 0.5]])]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans[0].maxCohesion).toBe(0.5);
    });

    it('should include sharedState info in orphan', () => {
      const staticResults = {
        files: {
          '/src/state-orphan.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {
              sharedState: {
                writes: ['counter'],
                reads: ['config']
              }
            }
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/state-orphan.js', new Map()]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans[0].sharedState.writes).toContain('counter');
      expect(orphans[0].sharedState.reads).toContain('config');
    });

    it('should include events info in orphan', () => {
      const staticResults = {
        files: {
          '/src/event-orphan.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {
              eventPatterns: {
                eventEmitters: ['click'],
                eventListeners: ['load']
              }
            }
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/event-orphan.js', new Map()]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans[0].events.emits).toContain('click');
      expect(orphans[0].events.listens).toContain('load');
    });

    it('should handle file not present in cohesion matrix', () => {
      const staticResults = {
        files: {
          '/src/new-file.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {}
          }
        }
      };
      const cohesionMatrix = new Map();
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans).toHaveLength(1);
      expect(orphans[0].file).toBe('/src/new-file.js');
    });

    it('should handle missing semanticAnalysis', () => {
      const staticResults = {
        files: {
          '/src/no-semantic.js': {
            imports: [],
            usedBy: []
          }
        }
      };
      const cohesionMatrix = new Map([
        ['/src/no-semantic.js', new Map()]
      ]);
      
      const orphans = identifyOrphans(staticResults, cohesionMatrix);
      
      expect(orphans).toHaveLength(1);
      expect(orphans[0].severity).toBe(Severity.LOW);
    });
  });

  describe('hasSignificantSideEffects', () => {
    it('should return false for null analysis', () => {
      const result = hasSignificantSideEffects(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined analysis', () => {
      const result = hasSignificantSideEffects(undefined);
      expect(result).toBe(false);
    });

    it('should return false for empty semanticAnalysis', () => {
      const result = hasSignificantSideEffects({ semanticAnalysis: {} });
      expect(result).toBe(false);
    });

    it('should return true when sharedState has writes', () => {
      const result = hasSignificantSideEffects({
        semanticAnalysis: {
          sharedState: { writes: ['state'], reads: [] }
        }
      });
      expect(result).toBe(true);
    });

    it('should return true when eventEmitters exist', () => {
      const result = hasSignificantSideEffects({
        semanticAnalysis: {
          eventPatterns: {
            eventEmitters: ['click'],
            eventListeners: []
          }
        }
      });
      expect(result).toBe(true);
    });

    it('should return true when hasGlobalAccess is true', () => {
      const result = hasSignificantSideEffects({
        semanticAnalysis: {
          sideEffects: { hasGlobalAccess: true }
        }
      });
      expect(result).toBe(true);
    });

    it('should return true when usesLocalStorage is true', () => {
      const result = hasSignificantSideEffects({
        semanticAnalysis: {
          sideEffects: { usesLocalStorage: true }
        }
      });
      expect(result).toBe(true);
    });

    it('should return false for clean file', () => {
      const result = hasSignificantSideEffects({
        semanticAnalysis: {
          sharedState: { writes: [], reads: [] },
          eventPatterns: { eventEmitters: [], eventListeners: [] },
          sideEffects: {}
        }
      });
      expect(result).toBe(false);
    });

    it('should return false when analysis is missing semanticAnalysis property', () => {
      const result = hasSignificantSideEffects({});
      expect(result).toBe(false);
    });
  });
});
