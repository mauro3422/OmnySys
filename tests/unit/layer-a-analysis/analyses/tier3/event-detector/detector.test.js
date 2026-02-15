import { describe, it, expect } from 'vitest';
import {
  detectEventPatterns,
  detectListeners,
  detectEmitters
} from '#layer-a/analyses/tier3/event-detector/detector.js';

describe('analyses/tier3/event-detector/detector.js', () => {
  it('detects listener/emitter patterns from source code', () => {
    const code = `
      bus.on('user.login', () => {});
      bus.emit('user.login', payload);
    `;
    const out = detectEventPatterns(code, 'events.js');
    expect(out.eventListeners.length).toBe(1);
    expect(out.eventEmitters.length).toBe(1);
    expect(detectListeners(code).length).toBe(1);
    expect(detectEmitters(code).length).toBe(1);
  });
});

