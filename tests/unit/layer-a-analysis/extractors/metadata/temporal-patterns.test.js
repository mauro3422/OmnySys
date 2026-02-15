import { describe, it, expect } from 'vitest';
import { extractTemporalPatterns } from '#layer-a/extractors/metadata/temporal-patterns.js';

describe('extractors/metadata/temporal-patterns.js', () => {
  it('extracts lifecycle hooks, events, timers and cleanup patterns', () => {
    const code = `
      useEffect(() => {
        document.addEventListener('click', onClick);
        const t = setTimeout(doWork, 50);
        return () => {
          document.removeEventListener('click', onClick);
          clearTimeout(t);
        };
      }, []);
    `;
    const out = extractTemporalPatterns(code);
    expect(out.lifecycleHooks.length).toBeGreaterThan(0);
    expect(out.eventHandlers.length).toBeGreaterThan(0);
    expect(out.timers.length).toBeGreaterThan(0);
    expect(out.cleanupPatterns.length).toBeGreaterThan(0);
    expect(out.all.length).toBeGreaterThan(0);
  });
});

