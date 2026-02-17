/**
 * @fileoverview shared-state.test.js
 * 
 * Tests para detector de problemas con shared state
 * 
 * @module tests/unit/layer-b-semantic/issue-detectors/shared-state
 */

import { describe, it, expect } from 'vitest';
import {
  detectUndefinedSharedState,
  detectDeadSharedState
} from '#layer-b/issue-detectors/shared-state.js';

describe('issue-detectors/shared-state', () => {
  describe('detectUndefinedSharedState', () => {
    it('should return empty array when no reads', () => {
      const globalState = {
        sharedState: { reads: {}, writes: {} }
      };
      
      const result = detectUndefinedSharedState(globalState);
      
      expect(result).toEqual([]);
    });

    it('should detect undefined shared state', () => {
      const globalState = {
        sharedState: {
          reads: { 'window.config': ['reader.js'] },
          writes: {}
        }
      };
      
      const result = detectUndefinedSharedState(globalState);
      
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('undefined-shared-state');
      expect(result[0].property).toBe('window.config');
    });

    it('should not report defined shared state', () => {
      const globalState = {
        sharedState: {
          reads: { 'window.config': ['reader.js'] },
          writes: { 'window.config': ['writer.js'] }
        }
      };
      
      const result = detectUndefinedSharedState(globalState);
      
      expect(result).toEqual([]);
    });

    it('should include readers in issue', () => {
      const globalState = {
        sharedState: {
          reads: { 'window.config': ['file1.js', 'file2.js'] },
          writes: {}
        }
      };
      
      const result = detectUndefinedSharedState(globalState);
      
      expect(result[0].readers).toContain('file1.js');
      expect(result[0].readers).toContain('file2.js');
    });

    it('should have high severity', () => {
      const globalState = {
        sharedState: {
          reads: { 'window.config': ['reader.js'] },
          writes: {}
        }
      };
      
      const result = detectUndefinedSharedState(globalState);
      
      expect(result[0].severity).toBe('high');
    });

    it('should include suggestion', () => {
      const globalState = {
        sharedState: {
          reads: { 'window.config': ['reader.js'] },
          writes: {}
        }
      };
      
      const result = detectUndefinedSharedState(globalState);
      
      expect(result[0].suggestion).toContain('Initialize');
    });

    it('should detect multiple undefined properties', () => {
      const globalState = {
        sharedState: {
          reads: {
            'window.prop1': ['file1.js'],
            'window.prop2': ['file2.js']
          },
          writes: {}
        }
      };
      
      const result = detectUndefinedSharedState(globalState);
      
      expect(result.length).toBe(2);
    });

    it('should handle empty writers array', () => {
      const globalState = {
        sharedState: {
          reads: { 'window.config': ['reader.js'] },
          writes: { 'window.config': [] }
        }
      };
      
      const result = detectUndefinedSharedState(globalState);
      
      expect(result.length).toBe(1);
    });
  });

  describe('detectDeadSharedState', () => {
    it('should return empty array when no writes', () => {
      const globalState = {
        sharedState: { reads: {}, writes: {} }
      };
      
      const result = detectDeadSharedState(globalState);
      
      expect(result).toEqual([]);
    });

    it('should detect dead shared state', () => {
      const globalState = {
        sharedState: {
          reads: {},
          writes: { 'window.temp': ['writer.js'] }
        }
      };
      
      const result = detectDeadSharedState(globalState);
      
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('dead-shared-state');
      expect(result[0].property).toBe('window.temp');
    });

    it('should not report used shared state', () => {
      const globalState = {
        sharedState: {
          reads: { 'window.config': ['reader.js'] },
          writes: { 'window.config': ['writer.js'] }
        }
      };
      
      const result = detectDeadSharedState(globalState);
      
      expect(result).toEqual([]);
    });

    it('should include writers in issue', () => {
      const globalState = {
        sharedState: {
          reads: {},
          writes: { 'window.temp': ['file1.js', 'file2.js'] }
        }
      };
      
      const result = detectDeadSharedState(globalState);
      
      expect(result[0].writers).toContain('file1.js');
      expect(result[0].writers).toContain('file2.js');
    });

    it('should have low severity', () => {
      const globalState = {
        sharedState: {
          reads: {},
          writes: { 'window.temp': ['writer.js'] }
        }
      };
      
      const result = detectDeadSharedState(globalState);
      
      expect(result[0].severity).toBe('low');
    });

    it('should include suggestion', () => {
      const globalState = {
        sharedState: {
          reads: {},
          writes: { 'window.temp': ['writer.js'] }
        }
      };
      
      const result = detectDeadSharedState(globalState);
      
      expect(result[0].suggestion).toContain('Remove');
    });

    it('should detect multiple dead properties', () => {
      const globalState = {
        sharedState: {
          reads: {},
          writes: {
            'window.prop1': ['file1.js'],
            'window.prop2': ['file2.js']
          }
        }
      };
      
      const result = detectDeadSharedState(globalState);
      
      expect(result.length).toBe(2);
    });

    it('should handle empty readers array', () => {
      const globalState = {
        sharedState: {
          reads: { 'window.config': [] },
          writes: { 'window.config': ['writer.js'] }
        }
      };
      
      const result = detectDeadSharedState(globalState);
      
      expect(result.length).toBe(1);
    });
  });
});
