import { describe, it, expect } from 'vitest';
import {
  normalizeResponse,
  normalizeSharedStateFromSimple,
  extractValidFilePaths
} from '#layer-b/llm-analyzer/response-normalizer.js';

describe('llm-analyzer/response-normalizer', () => {
  describe('normalizeResponse', () => {
    it('should return null for null response', () => {
      const result = normalizeResponse(null, '/src/file.js');
      expect(result).toBeNull();
    });

    it('should return null for response with error', () => {
      const result = normalizeResponse({ error: 'Something went wrong' }, '/src/file.js');
      expect(result).toBeNull();
    });

    it('should return null for raw text response', () => {
      const result = normalizeResponse({ rawResponse: 'Some text' }, '/src/file.js');
      expect(result).toBeNull();
    });

    it('should normalize basic response', () => {
      const response = {
        confidence: 0.9,
        reasoning: 'Test reasoning'
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result).not.toBeNull();
      expect(result.source).toBe('llm');
      expect(result.confidence).toBe(0.9);
      expect(result.reasoning).toBe('Test reasoning');
    });

    it('should use default confidence if not provided', () => {
      const response = { someData: 'value' };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.confidence).toBe(0.8);
    });

    it('should use default reasoning if not provided', () => {
      const response = { confidence: 0.9 };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.reasoning).toBe('No reasoning provided');
    });

    it('should normalize analysisResult nested structure', () => {
      const response = {
        analysisResult: {
          confidence: 0.85,
          reasoning: 'Nested reasoning'
        }
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.confidence).toBe(0.85);
      expect(result.reasoning).toBe('Nested reasoning');
    });

    it('should handle case-insensitive analysisResult', () => {
      const response = {
        analysisresult: {
          confidence: 0.75,
          reasoning: 'Lowercase key'
        }
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.confidence).toBe(0.75);
    });

    it('should map connectedFiles to affectedFiles', () => {
      const response = {
        confidence: 0.9,
        connectedFiles: ['/src/a.js', '/src/b.js']
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.affectedFiles).toEqual(['/src/a.js', '/src/b.js']);
    });

    it('should map potentialUsage to affectedFiles', () => {
      const response = {
        confidence: 0.9,
        potentialUsage: ['/src/x.js']
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.affectedFiles).toEqual(['/src/x.js']);
    });

    it('should map localStorageKeys correctly', () => {
      const response = {
        confidence: 0.9,
        localStorageKeys: ['token', 'user']
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.localStorageKeys).toEqual(['token', 'user']);
    });

    it('should map eventNames correctly', () => {
      const response = {
        confidence: 0.9,
        eventNames: ['click', 'submit']
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.eventNames).toEqual(['click', 'submit']);
    });

    it('should include suggestedConnections', () => {
      const response = {
        confidence: 0.9,
        suggestedConnections: [{ from: '/src/a.js', to: '/src/b.js' }]
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.suggestedConnections).toHaveLength(1);
    });

    it('should include hiddenConnections', () => {
      const response = {
        confidence: 0.9,
        hiddenConnections: [{ type: 'implicit' }]
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.hiddenConnections).toHaveLength(1);
    });

    it('should set default connectionType to none', () => {
      const response = { confidence: 0.9 };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.connectionType).toBe('none');
    });

    it('should preserve connectionType from response', () => {
      const response = {
        confidence: 0.9,
        connectionType: 'shared-state'
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.connectionType).toBe('shared-state');
    });

    it('should handle sharedState in response', () => {
      const response = {
        confidence: 0.9,
        sharedState: {
          reads: ['config'],
          writes: ['state']
        }
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.sharedState).toEqual({
        reads: ['config'],
        writes: ['state']
      });
    });

    it('should handle events in response', () => {
      const response = {
        confidence: 0.9,
        events: {
          emits: ['click'],
          listens: ['load']
        }
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.events).toEqual({
        emits: ['click'],
        listens: ['load']
      });
    });

    it('should return null when confidence below threshold', () => {
      const response = { confidence: 0.5 };
      
      const result = normalizeResponse(response, '/src/file.js', 0.7);
      
      expect(result).toBeNull();
    });

    it('should accept response with confidence equal to threshold', () => {
      const response = { confidence: 0.7 };
      
      const result = normalizeResponse(response, '/src/file.js', 0.7);
      
      expect(result).not.toBeNull();
    });

    it('should use default confidence threshold of 0.7', () => {
      const response = { confidence: 0.69 };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result).toBeNull();
    });

    it('should create sharedState from connectionType shared-state', () => {
      const response = {
        confidence: 0.9,
        connectionType: 'shared-state',
        sharedState: { reads: ['key'], writes: [] }
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.sharedState).toBeDefined();
    });

    it('should create events from connectionType global', () => {
      const response = {
        confidence: 0.9,
        connectionType: 'global',
        events: { emits: [], listens: [] }
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.events).toBeDefined();
    });

    it('should map sharedState.reads to localStorageKeys', () => {
      const response = {
        confidence: 0.9,
        sharedState: {
          reads: ['token', 'userId']
        }
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.localStorageKeys).toEqual(['token', 'userId']);
    });

    it('should map events.listens to eventNames', () => {
      const response = {
        confidence: 0.9,
        events: {
          listens: ['resize', 'scroll']
        }
      };
      
      const result = normalizeResponse(response, '/src/file.js');
      
      expect(result.eventNames).toEqual(['resize', 'scroll']);
    });
  });

  describe('normalizeSharedStateFromSimple', () => {
    it('should return empty structure for null keys', () => {
      const result = normalizeSharedStateFromSimple(null, 'localStorage');
      
      expect(result).toEqual({ reads: [], writes: [] });
    });

    it('should return empty structure for empty keys', () => {
      const result = normalizeSharedStateFromSimple([], 'localStorage');
      
      expect(result).toEqual({ reads: [], writes: [] });
    });

    it('should map keys to reads and writes for localStorage type', () => {
      const result = normalizeSharedStateFromSimple(['token', 'user'], 'localStorage');
      
      expect(result.reads).toEqual(['token', 'user']);
      expect(result.writes).toEqual(['token', 'user']);
    });

    it('should return empty arrays for non-localStorage type', () => {
      const result = normalizeSharedStateFromSimple(['key1'], 'other');
      
      expect(result.reads).toEqual([]);
      expect(result.writes).toEqual([]);
    });

    it('should handle single key', () => {
      const result = normalizeSharedStateFromSimple(['singleKey'], 'localStorage');
      
      expect(result.reads).toHaveLength(1);
      expect(result.writes).toHaveLength(1);
    });

    it('should handle multiple keys', () => {
      const result = normalizeSharedStateFromSimple(['a', 'b', 'c'], 'localStorage');
      
      expect(result.reads).toHaveLength(3);
      expect(result.writes).toHaveLength(3);
    });
  });

  describe('extractValidFilePaths', () => {
    it('should return empty array for null context', () => {
      const result = extractValidFilePaths(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined context', () => {
      const result = extractValidFilePaths(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for missing fileSpecific', () => {
      const result = extractValidFilePaths({});
      expect(result).toEqual([]);
    });

    it('should return empty array for missing allProjectFiles', () => {
      const result = extractValidFilePaths({ fileSpecific: {} });
      expect(result).toEqual([]);
    });

    it('should extract paths from project files', () => {
      const context = {
        fileSpecific: {
          allProjectFiles: [
            { path: '/src/a.js' },
            { path: '/src/b.js' },
            { path: '/src/c.js' }
          ]
        }
      };
      
      const result = extractValidFilePaths(context);
      
      expect(result).toEqual(['/src/a.js', '/src/b.js', '/src/c.js']);
    });

    it('should skip files without path property', () => {
      const context = {
        fileSpecific: {
          allProjectFiles: [
            { path: '/src/a.js' },
            { name: 'no-path.js' },
            { path: '/src/c.js' }
          ]
        }
      };
      
      const result = extractValidFilePaths(context);
      
      expect(result).toEqual(['/src/a.js', '/src/c.js']);
    });

    it('should handle empty allProjectFiles array', () => {
      const context = {
        fileSpecific: {
          allProjectFiles: []
        }
      };
      
      const result = extractValidFilePaths(context);
      
      expect(result).toEqual([]);
    });

    it('should handle files with additional properties', () => {
      const context = {
        fileSpecific: {
          allProjectFiles: [
            { path: '/src/a.js', name: 'a.js', size: 1024 }
          ]
        }
      };
      
      const result = extractValidFilePaths(context);
      
      expect(result).toEqual(['/src/a.js']);
    });
  });
});
