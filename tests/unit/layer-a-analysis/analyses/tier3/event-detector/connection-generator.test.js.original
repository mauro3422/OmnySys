import { describe, it, expect } from 'vitest';
import { generateEventConnections } from '#layer-a/analyses/tier3/event-detector/connection-generator.js';

describe('analyses/tier3/event-detector/connection-generator.js', () => {
  it('generates semantic event connections across files', () => {
    const map = {
      'src/emitter.js': {
        eventEmitters: [{ eventName: 'user.login', objectName: 'bus', confidence: 1, line: 1 }],
        eventListeners: []
      },
      'src/listener.js': {
        eventEmitters: [],
        eventListeners: [{ eventName: 'user.login', objectName: 'bus', confidence: 1, line: 2 }]
      }
    };
    const out = generateEventConnections(map);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].type).toBe('event_listener');
  });
});

