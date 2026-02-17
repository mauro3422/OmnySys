/**
 * @fileoverview global-state-builder.test.js
 * 
 * Tests para el builder de estado global
 * 
 * @module tests/unit/layer-b-semantic/issue-detectors/global-state-builder
 */

import { describe, it, expect } from 'vitest';
import { buildGlobalState } from '#layer-b/issue-detectors/global-state-builder.js';

describe('issue-detectors/global-state-builder', () => {
  describe('buildGlobalState', () => {
    it('should return empty state for empty results', () => {
      const enrichedResults = { files: {} };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.reads).toEqual({});
      expect(result.sharedState.writes).toEqual({});
      expect(result.events.emitters).toEqual({});
      expect(result.events.listeners).toEqual({});
      expect(result.files).toEqual({});
    });

    it('should index shared state reads', () => {
      const enrichedResults = {
        files: {
          'src/file1.js': {
            semanticAnalysis: {
              sharedState: { reads: ['window.gameState', 'window.user'] }
            }
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.reads['window.gameState']).toContain('src/file1.js');
      expect(result.sharedState.reads['window.user']).toContain('src/file1.js');
    });

    it('should index shared state writes', () => {
      const enrichedResults = {
        files: {
          'src/file1.js': {
            semanticAnalysis: {
              sharedState: { writes: ['window.config'] }
            }
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.writes['window.config']).toContain('src/file1.js');
    });

    it('should index event emitters', () => {
      const enrichedResults = {
        files: {
          'src/button.js': {
            semanticAnalysis: {
              eventPatterns: { eventEmitters: ['user:click'] }
            }
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.events.emitters['user:click']).toContain('src/button.js');
    });

    it('should index event listeners', () => {
      const enrichedResults = {
        files: {
          'src/analytics.js': {
            semanticAnalysis: {
              eventPatterns: { eventListeners: ['user:click', 'app:init'] }
            }
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.events.listeners['user:click']).toContain('src/analytics.js');
      expect(result.events.listeners['app:init']).toContain('src/analytics.js');
    });

    it('should aggregate multiple files for same state', () => {
      const enrichedResults = {
        files: {
          'src/file1.js': {
            semanticAnalysis: {
              sharedState: { reads: ['window.state'] }
            }
          },
          'src/file2.js': {
            semanticAnalysis: {
              sharedState: { reads: ['window.state'] }
            }
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.reads['window.state']).toContain('src/file1.js');
      expect(result.sharedState.reads['window.state']).toContain('src/file2.js');
      expect(result.sharedState.reads['window.state'].length).toBe(2);
    });

    it('should aggregate multiple files for same event', () => {
      const enrichedResults = {
        files: {
          'src/button1.js': {
            semanticAnalysis: {
              eventPatterns: { eventEmitters: ['user:click'] }
            }
          },
          'src/button2.js': {
            semanticAnalysis: {
              eventPatterns: { eventEmitters: ['user:click'] }
            }
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.events.emitters['user:click'].length).toBe(2);
      expect(result.events.emitters['user:click']).toContain('src/button1.js');
      expect(result.events.emitters['user:click']).toContain('src/button2.js');
    });

    it('should store file analysis reference', () => {
      const fileAnalysis = {
        semanticAnalysis: { sharedState: { reads: [] } }
      };
      const enrichedResults = {
        files: {
          'src/file.js': fileAnalysis
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.files['src/file.js']).toBe(fileAnalysis);
    });

    it('should handle missing semanticAnalysis', () => {
      const enrichedResults = {
        files: {
          'src/file.js': {}
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.reads).toEqual({});
      expect(result.sharedState.writes).toEqual({});
    });

    it('should handle missing sharedState', () => {
      const enrichedResults = {
        files: {
          'src/file.js': {
            semanticAnalysis: {}
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.reads).toEqual({});
      expect(result.sharedState.writes).toEqual({});
    });

    it('should handle missing eventPatterns', () => {
      const enrichedResults = {
        files: {
          'src/file.js': {
            semanticAnalysis: {}
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.events.emitters).toEqual({});
      expect(result.events.listeners).toEqual({});
    });

    it('should handle alternative readProperties field', () => {
      const enrichedResults = {
        files: {
          'src/file.js': {
            semanticAnalysis: {
              sharedState: { readProperties: ['window.alt'] }
            }
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.reads['window.alt']).toContain('src/file.js');
    });

    it('should handle alternative writeProperties field', () => {
      const enrichedResults = {
        files: {
          'src/file.js': {
            semanticAnalysis: {
              sharedState: { writeProperties: ['window.alt'] }
            }
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.writes['window.alt']).toContain('src/file.js');
    });

    it('should handle empty arrays', () => {
      const enrichedResults = {
        files: {
          'src/file.js': {
            semanticAnalysis: {
              sharedState: { reads: [], writes: [] },
              eventPatterns: { eventEmitters: [], eventListeners: [] }
            }
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.reads).toEqual({});
      expect(result.sharedState.writes).toEqual({});
      expect(result.events.emitters).toEqual({});
      expect(result.events.listeners).toEqual({});
    });

    it('should handle missing files', () => {
      const enrichedResults = {};
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.reads).toEqual({});
      expect(result.sharedState.writes).toEqual({});
    });

    it('should handle null files', () => {
      const enrichedResults = { files: null };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.reads).toEqual({});
      expect(result.sharedState.writes).toEqual({});
    });

    it('should handle complex state with both reads and writes', () => {
      const enrichedResults = {
        files: {
          'src/reader.js': {
            semanticAnalysis: {
              sharedState: { reads: ['window.shared'] }
            }
          },
          'src/writer.js': {
            semanticAnalysis: {
              sharedState: { writes: ['window.shared'] }
            }
          }
        }
      };
      
      const result = buildGlobalState(enrichedResults);
      
      expect(result.sharedState.reads['window.shared']).toContain('src/reader.js');
      expect(result.sharedState.writes['window.shared']).toContain('src/writer.js');
    });
  });
});
