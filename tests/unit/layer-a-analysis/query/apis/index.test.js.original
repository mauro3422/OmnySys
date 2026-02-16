import { describe, it, expect } from 'vitest';
import * as apis from '#layer-a/query/apis/index.js';

describe('query/apis/index.js', () => {
  it('re-exports query domain APIs from a centralized entrypoint', () => {
    expect(apis).toBeTypeOf('object');
    expect(Object.keys(apis).length).toBeGreaterThan(0);
  });
});
