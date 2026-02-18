/**
 * @fileoverview unhandled-events.test.js
 * 
 * Tests para detector de eventos sin handlers
 * 
 * @module tests/unit/layer-b-semantic/issue-detectors/unhandled-events
 */

import { describe, it, expect } from 'vitest';
import { detectUnhandledEvents } from '#layer-a/analyses/tier3/issue-detectors/unhandled-events.js';

describe('issue-detectors/unhandled-events', () => {
  describe('detectUnhandledEvents', () => {
    it('should return empty array when no events', () => {
      const globalState = {
        events: { emitters: {}, listeners: {} }
      };
      
      const result = detectUnhandledEvents(globalState);
      
      expect(result).toEqual([]);
    });

    it('should detect unhandled event', () => {
      const globalState = {
        events: {
          emitters: { 'user:click': ['button.js'] },
          listeners: {}
        }
      };
      
      const result = detectUnhandledEvents(globalState);
      
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('unhandled-event');
      expect(result[0].event).toBe('user:click');
    });

    it('should not report handled events', () => {
      const globalState = {
        events: {
          emitters: { 'user:click': ['button.js'] },
          listeners: { 'user:click': ['analytics.js'] }
        }
      };
      
      const result = detectUnhandledEvents(globalState);
      
      expect(result).toEqual([]);
    });

    it('should detect multiple unhandled events', () => {
      const globalState = {
        events: {
          emitters: {
            'event1': ['file1.js'],
            'event2': ['file2.js']
          },
          listeners: {}
        }
      };
      
      const result = detectUnhandledEvents(globalState);
      
      expect(result.length).toBe(2);
    });

    it('should include emitters in issue', () => {
      const globalState = {
        events: {
          emitters: { 'user:click': ['button.js', 'link.js'] },
          listeners: {}
        }
      };
      
      const result = detectUnhandledEvents(globalState);
      
      expect(result[0].emitters).toContain('button.js');
      expect(result[0].emitters).toContain('link.js');
    });

    it('should have correct severity', () => {
      const globalState = {
        events: {
          emitters: { 'user:click': ['button.js'] },
          listeners: {}
        }
      };
      
      const result = detectUnhandledEvents(globalState);
      
      expect(result[0].severity).toBe('medium');
    });

    it('should include suggestion', () => {
      const globalState = {
        events: {
          emitters: { 'user:click': ['button.js'] },
          listeners: {}
        }
      };
      
      const result = detectUnhandledEvents(globalState);
      
      expect(result[0].suggestion).toBe('Add listener or remove unused emit');
    });

    it('should handle empty listeners', () => {
      const globalState = {
        events: {
          emitters: { 'event1': ['file.js'] },
          listeners: { 'event1': [] }
        }
      };
      
      const result = detectUnhandledEvents(globalState);
      
      expect(result.length).toBe(1);
    });
  });
});
