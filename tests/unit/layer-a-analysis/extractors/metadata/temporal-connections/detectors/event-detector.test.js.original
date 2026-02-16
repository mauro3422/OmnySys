import { describe, it, expect } from 'vitest';
import { detectEvents } from '#layer-a/extractors/metadata/temporal-connections/detectors/event-detector.js';
import eventDetector from '#layer-a/extractors/metadata/temporal-connections/detectors/event-detector.js';

describe('extractors/metadata/temporal-connections/detectors/event-detector.js', () => {
  it('detects addEventListener patterns with cleanup', () => {
    const code = `
      el.addEventListener('click', onClick);
      el.removeEventListener('click', onClick);
    `;
    const out = detectEvents(code);
    expect(out.some(e => e.type === 'addEventListener' && e.event === 'click')).toBe(true);
  });

  it('default detector strategy exposes name and supports()', () => {
    expect(eventDetector.name).toBe('event');
    expect(eventDetector.supports('bus.on("msg", handler)')).toBe(true);
  });
});

