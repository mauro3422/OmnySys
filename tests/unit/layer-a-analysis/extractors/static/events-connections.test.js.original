/**
 * @fileoverview events-connections.test.js
 * 
 * Tests for Events Connections
 * Tests detectEventConnections, sharesEvents, getEventFlow
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/events-connections
 */

import { describe, it, expect } from 'vitest';
import {
  detectEventConnections,
  sharesEvents,
  getEventFlow
} from '#layer-a/extractors/static/events-connections.js';
import { ConnectionType } from '#layer-a/extractors/static/constants.js';
import { StaticConnectionBuilder, EventBuilder } from '../../../../factories/static-extractor-test.factory.js';

describe('Events Connections', () => {
  describe('detectEventConnections', () => {
    it('should detect connections between emitter and listener', () => {
      const fileResults = {
        'emitter.js': {
          events: {
            emitters: [{ event: 'user:login', line: 1 }],
            listeners: [],
            all: [{ event: 'user:login', line: 1, type: 'emitter' }]
          }
        },
        'listener.js': {
          events: {
            emitters: [],
            listeners: [{ event: 'user:login', line: 1 }],
            all: [{ event: 'user:login', line: 1, type: 'listener' }]
          }
        }
      };

      const connections = detectEventConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].type).toBe(ConnectionType.EVENT_LISTENER);
    });

    it('should create connection with correct structure', () => {
      const fileResults = {
        'a.js': {
          events: {
            emitters: [{ event: 'test', line: 1 }],
            listeners: [],
            all: [{ event: 'test', line: 1, type: 'emitter' }]
          }
        },
        'b.js': {
          events: {
            emitters: [],
            listeners: [{ event: 'test', line: 1 }],
            all: [{ event: 'test', line: 1, type: 'listener' }]
          }
        }
      };

      const connections = detectEventConnections(fileResults);

      expect(connections[0]).toHaveProperty('id');
      expect(connections[0]).toHaveProperty('sourceFile');
      expect(connections[0]).toHaveProperty('targetFile');
      expect(connections[0]).toHaveProperty('type');
      expect(connections[0]).toHaveProperty('event');
      expect(connections[0]).toHaveProperty('confidence');
      expect(connections[0]).toHaveProperty('detectedBy');
    });

    it('should determine direction from emitter to listener', () => {
      const fileResults = {
        'emitter.js': {
          events: {
            emitters: [{ event: 'event1', line: 1 }],
            listeners: [],
            all: [{ event: 'event1', line: 1, type: 'emitter' }]
          }
        },
        'listener.js': {
          events: {
            emitters: [],
            listeners: [{ event: 'event1', line: 1 }],
            all: [{ event: 'event1', line: 1, type: 'listener' }]
          }
        }
      };

      const connections = detectEventConnections(fileResults);

      expect(connections[0].sourceFile).toBe('emitter.js');
      expect(connections[0].targetFile).toBe('listener.js');
    });

    it('should handle multiple shared events', () => {
      const fileResults = {
        'a.js': {
          events: {
            emitters: [{ event: 'event1', line: 1 }, { event: 'event2', line: 2 }],
            listeners: [],
            all: [
              { event: 'event1', line: 1, type: 'emitter' },
              { event: 'event2', line: 2, type: 'emitter' }
            ]
          }
        },
        'b.js': {
          events: {
            emitters: [],
            listeners: [{ event: 'event1', line: 1 }, { event: 'event2', line: 2 }],
            all: [
              { event: 'event1', line: 1, type: 'listener' },
              { event: 'event2', line: 2, type: 'listener' }
            ]
          }
        }
      };

      const connections = detectEventConnections(fileResults);

      expect(connections.length).toBe(2);
    });

    it('should return empty array when no shared events', () => {
      const fileResults = {
        'a.js': {
          events: {
            emitters: [{ event: 'eventA', line: 1 }],
            listeners: [],
            all: [{ event: 'eventA', line: 1, type: 'emitter' }]
          }
        },
        'b.js': {
          events: {
            emitters: [],
            listeners: [{ event: 'eventB', line: 1 }],
            all: [{ event: 'eventB', line: 1, type: 'listener' }]
          }
        }
      };

      const connections = detectEventConnections(fileResults);

      expect(connections).toEqual([]);
    });

    it('should handle empty file results', () => {
      const connections = detectEventConnections({});

      expect(connections).toEqual([]);
    });

    it('should handle single file', () => {
      const fileResults = {
        'only.js': {
          events: { emitters: [], listeners: [], all: [] }
        }
      };

      const connections = detectEventConnections(fileResults);

      expect(connections).toEqual([]);
    });

    it('should work with StaticConnectionBuilder shared event scenario', () => {
      const builder = new StaticConnectionBuilder();
      builder.withSharedEventScenario();
      const files = builder.build();

      const fileResults = {};
      for (const [path, data] of Object.entries(files)) {
        fileResults[path] = { events: data.events };
      }

      const connections = detectEventConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      connections.forEach(conn => {
        expect(conn.type).toBe(ConnectionType.EVENT_LISTENER);
        expect(conn.event).toBe('user:login');
      });
    });
  });

  describe('sharesEvents', () => {
    it('should return true when events are shared', () => {
      const eventsA = {
        all: [{ event: 'click' }, { event: 'submit' }]
      };
      const eventsB = {
        all: [{ event: 'click' }]
      };

      const result = sharesEvents(eventsA, eventsB);

      expect(result).toBe(true);
    });

    it('should return false when no events are shared', () => {
      const eventsA = { all: [{ event: 'click' }] };
      const eventsB = { all: [{ event: 'submit' }] };

      const result = sharesEvents(eventsA, eventsB);

      expect(result).toBe(false);
    });

    it('should return false when first has no events', () => {
      const eventsA = { all: [] };
      const eventsB = { all: [{ event: 'click' }] };

      const result = sharesEvents(eventsA, eventsB);

      expect(result).toBe(false);
    });

    it('should return false when second has no events', () => {
      const eventsA = { all: [{ event: 'click' }] };
      const eventsB = { all: [] };

      const result = sharesEvents(eventsA, eventsB);

      expect(result).toBe(false);
    });

    it('should handle null/undefined inputs', () => {
      expect(sharesEvents(null, { all: [] })).toBe(false);
      expect(sharesEvents({ all: [] }, null)).toBe(false);
      expect(sharesEvents(undefined, { all: [] })).toBe(false);
    });
  });

  describe('getEventFlow', () => {
    it('should detect A emits -> B listens flow', () => {
      const eventsA = {
        emitters: [{ event: 'test' }],
        listeners: []
      };
      const eventsB = {
        emitters: [],
        listeners: [{ event: 'test' }]
      };

      const flow = getEventFlow(eventsA, eventsB, 'test');

      expect(flow.source).toBe('A');
      expect(flow.target).toBe('B');
      expect(flow.flow).toBe('A → B');
    });

    it('should detect B emits -> A listens flow', () => {
      const eventsA = {
        emitters: [],
        listeners: [{ event: 'test' }]
      };
      const eventsB = {
        emitters: [{ event: 'test' }],
        listeners: []
      };

      const flow = getEventFlow(eventsA, eventsB, 'test');

      expect(flow.source).toBe('B');
      expect(flow.target).toBe('A');
      expect(flow.flow).toBe('B → A');
    });

    it('should return bidirectional when both emit and listen', () => {
      const eventsA = {
        emitters: [{ event: 'test' }],
        listeners: [{ event: 'test' }]
      };
      const eventsB = {
        emitters: [{ event: 'test' }],
        listeners: [{ event: 'test' }]
      };

      const flow = getEventFlow(eventsA, eventsB, 'test');

      expect(flow.flow).toBe('bidirectional');
    });

    it('should return bidirectional when no clear direction', () => {
      const eventsA = {
        emitters: [],
        listeners: [{ event: 'test' }]
      };
      const eventsB = {
        emitters: [],
        listeners: [{ event: 'test' }]
      };

      const flow = getEventFlow(eventsA, eventsB, 'test');

      expect(flow.flow).toBe('bidirectional');
    });

    it('should handle null/undefined inputs gracefully', () => {
      const flow = getEventFlow(null, null, 'test');

      expect(flow.flow).toBe('bidirectional');
      expect(flow.source).toBeNull();
      expect(flow.target).toBeNull();
    });
  });

  describe('Connection properties', () => {
    it('should include via property', () => {
      const fileResults = {
        'a.js': {
          events: {
            emitters: [{ event: 'test', line: 1 }],
            listeners: [],
            all: [{ event: 'test', line: 1, type: 'emitter' }]
          }
        },
        'b.js': {
          events: {
            emitters: [],
            listeners: [{ event: 'test', line: 1 }],
            all: [{ event: 'test', line: 1, type: 'listener' }]
          }
        }
      };

      const connections = detectEventConnections(fileResults);

      expect(connections[0].via).toBe('event');
    });

    it('should include reason property', () => {
      const fileResults = {
        'a.js': {
          events: {
            emitters: [{ event: 'myevent', line: 1 }],
            listeners: [],
            all: [{ event: 'myevent', line: 1, type: 'emitter' }]
          }
        },
        'b.js': {
          events: {
            emitters: [],
            listeners: [{ event: 'myevent', line: 1 }],
            all: [{ event: 'myevent', line: 1, type: 'listener' }]
          }
        }
      };

      const connections = detectEventConnections(fileResults);

      expect(connections[0].reason).toContain('myevent');
    });

    it('should have default confidence of 1.0', () => {
      const fileResults = {
        'a.js': {
          events: {
            emitters: [{ event: 'test', line: 1 }],
            listeners: [],
            all: [{ event: 'test', line: 1, type: 'emitter' }]
          }
        },
        'b.js': {
          events: {
            emitters: [],
            listeners: [{ event: 'test', line: 1 }],
            all: [{ event: 'test', line: 1, type: 'listener' }]
          }
        }
      };

      const connections = detectEventConnections(fileResults);

      expect(connections[0].confidence).toBe(1.0);
    });
  });
});
