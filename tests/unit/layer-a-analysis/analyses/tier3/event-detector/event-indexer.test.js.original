import { describe, it, expect } from 'vitest';
import {
  indexEventsByName,
  indexBusObjects,
  getBusAccessors,
  getEventStats
} from '#layer-a/analyses/tier3/event-detector/event-indexer.js';

describe('analyses/tier3/event-detector/event-indexer.js', () => {
  it('indexes listeners/emitters by event and bus object', () => {
    const map = {
      'a.js': {
        eventListeners: [{ eventName: 'auth.login', objectName: 'bus' }],
        eventEmitters: [{ eventName: 'auth.login', objectName: 'bus' }]
      }
    };
    const eventIndex = indexEventsByName(map);
    expect(eventIndex.get('auth.login').listeners.length).toBe(1);
    const busIndex = indexBusObjects(map);
    expect(getBusAccessors(busIndex.get('bus')).length).toBe(1);
    expect(getEventStats(eventIndex).totalEvents).toBe(1);
  });
});

