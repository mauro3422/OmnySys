import { describe, it, expect } from 'vitest';
import {
  detectBusOwners,
  isPossibleBusOwner,
  getBusOwner,
  getOrphanBuses
} from '#layer-a/analyses/tier3/event-detector/bus-owner-detector.js';

describe('analyses/tier3/event-detector/bus-owner-detector.js', () => {
  it('detects bus owners and helper behaviors', () => {
    const busIndex = new Map([
      ['window', { listeners: ['src/a.js'], emitters: ['src/b.js'], ownerFile: null }]
    ]);
    const fileMap = {
      'src/eventbus.js': {},
      'src/a.js': {},
      'src/b.js': {}
    };
    const owners = detectBusOwners(busIndex, fileMap);
    expect(isPossibleBusOwner('src/eventbus.js')).toBe(true);
    expect(getBusOwner('window', owners)).toBeTruthy();
    expect(getOrphanBuses(busIndex, owners)).toEqual([]);
  });
});

