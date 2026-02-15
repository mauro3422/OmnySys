import { describe, it, expect } from 'vitest';
import { isLikelyEntryPoint, isPublicAPI } from '#layer-a/analyses/helpers.js';

describe('analyses/helpers.js', () => {
  it('detects likely entry points by file name', () => {
    expect(isLikelyEntryPoint('src/index.js')).toBe(true);
    expect(isLikelyEntryPoint('src/server-main.js')).toBe(true);
    expect(isLikelyEntryPoint('src/feature/widget.js')).toBe(false);
  });

  it('detects public API exports on main modules', () => {
    expect(isPublicAPI('src/layer-a-static/indexer.js', 'indexProject')).toBe(true);
    expect(isPublicAPI('src/layer-a-static/analyses/foo.js', 'analyzeFoo')).toBe(false);
  });
});

