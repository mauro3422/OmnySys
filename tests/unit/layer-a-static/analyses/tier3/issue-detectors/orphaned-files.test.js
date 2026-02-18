/**
 * @fileoverview orphaned-files.test.js
 * 
 * Tests para detector de archivos huérfanos
 * 
 * @module tests/unit/layer-b-semantic/issue-detectors/orphaned-files
 */

import { describe, it, expect } from 'vitest';
import { detectOrphanedFiles } from '#layer-a/analyses/tier3/issue-detectors/orphaned-files.js';
import { EnrichedResultsBuilder } from '../../../../../factories/layer-b-metadata/builders.js';

describe('issue-detectors/orphaned-files', () => {
  describe('detectOrphanedFiles', () => {
    it('should return empty array when no files', () => {
      const enrichedResults = { files: {} };
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result).toEqual([]);
    });

    it('should detect orphan with global access', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/orphan.js', {
          imports: [],
          usedBy: [],
          hasGlobalAccess: true
        })
        .build();
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('orphan-with-global-access');
      expect(result[0].severity).toBe('high');
      expect(result[0].file).toBe('src/orphan.js');
    });

    it('should detect orphan with localStorage', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/orphan.js', {
          imports: [],
          usedBy: [],
          usesLocalStorage: true
        })
        .build();
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('orphan-with-localstorage');
      expect(result[0].severity).toBe('medium');
    });

    it('should detect orphan with events', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/orphan.js', {
          imports: [],
          usedBy: [],
          hasGlobalAccess: false,
          usesLocalStorage: false,
          eventEmitters: ['user:click']
        })
        .build();
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('orphan-with-events');
      expect(result[0].severity).toBe('medium');
    });

    it('should not detect non-orphan files', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/connected.js', {
          imports: ['react'],
          usedBy: ['src/app.js'],
          hasGlobalAccess: true
        })
        .build();
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result).toEqual([]);
    });

    it('should not detect orphan without side effects', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/orphan.js', {
          imports: [],
          usedBy: []
        })
        .build();
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result).toEqual([]);
    });

    it('should include evidence for global access', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/orphan.js', {
          imports: [],
          usedBy: [],
          hasGlobalAccess: true,
          usesLocalStorage: false,
          sharedStateWrites: ['config', 'state']
        })
        .build();
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('orphan-with-global-access');
      expect(result[0].evidence).toHaveProperty('sharedStateWrites');
    });

    it('should include evidence for localStorage', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/orphan.js', {
          imports: [],
          usedBy: [],
          usesLocalStorage: true
        })
        .build();
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result[0].evidence).toHaveProperty('hasLocalStorage');
      expect(result[0].evidence.hasLocalStorage).toBe(true);
    });

    it('should include evidence for events', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/orphan.js', {
          imports: [],
          usedBy: [],
          hasGlobalAccess: false,
          usesLocalStorage: false,
          eventEmitters: ['event1', 'event2'],
          eventListeners: ['event3']
        })
        .build();
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result[0].evidence).toHaveProperty('events');
      expect(result[0].evidence.events.emits).toContain('event1');
      expect(result[0].evidence.events.listens).toContain('event3');
    });

    it('should handle files with semantic connections', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/orphan.js', {
          imports: [],
          usedBy: [],
          hasGlobalAccess: true,
          semanticConnections: [{ target: 'other.js' }]
        })
        .build();
      
      const result = detectOrphanedFiles(enrichedResults);
      
      // Should not detect because has semantic connections
      expect(result).toEqual([]);
    });

    it('should detect multiple orphans', () => {
      const enrichedResults = new EnrichedResultsBuilder()
        .addFile('src/orphan1.js', {
          imports: [],
          usedBy: [],
          hasGlobalAccess: true
        })
        .addFile('src/orphan2.js', {
          imports: [],
          usedBy: [],
          usesLocalStorage: true
        })
        .build();
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result.length).toBe(2);
    });

    it('should handle missing semanticAnalysis', () => {
      const enrichedResults = {
        files: {
          'src/orphan.js': {
            imports: [],
            usedBy: []
          }
        }
      };
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result).toEqual([]);
    });

    it('should handle missing sideEffects', () => {
      const enrichedResults = {
        files: {
          'src/orphan.js': {
            imports: [],
            usedBy: [],
            semanticAnalysis: {}
          }
        }
      };
      
      const result = detectOrphanedFiles(enrichedResults);
      
      expect(result).toEqual([]);
    });
  });
});
