import { describe, it, expect } from 'vitest';
import {
  detectPropagationPattern,
  detectUnhandledCalls
} from '#layer-a/extractors/metadata/error-flow/analyzers/propagation-analyzer.js';

describe('extractors/metadata/error-flow/analyzers/propagation-analyzer.js', () => {
  it('detects propagation mode from try/catch/throw combinations', () => {
    expect(detectPropagationPattern('const x = 1;')).toBe('none');
    expect(detectPropagationPattern('try { a(); throw e; } catch (e) { throw e; }')).toBe('partial');
    expect(detectPropagationPattern('try { throw e; } catch (e) { log(e); }')).toBe('full');
  });

  it('detects risky calls outside try blocks', () => {
    const unhandled = detectUnhandledCalls('fetch("/a"); try { JSON.parse(raw); } catch(e) {}');
    expect(unhandled.some(u => u.call === 'fetch')).toBe(true);
    expect(unhandled.some(u => u.call === 'JSON.parse')).toBe(false);
  });
});

