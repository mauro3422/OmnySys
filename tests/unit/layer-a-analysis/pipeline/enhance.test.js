import { describe, it, expect } from 'vitest';

describe('pipeline/enhance.js', () => {
  it('fails import while legacy architecture-utils path is unresolved (real blocker)', async () => {
    await expect(import('#layer-a/pipeline/enhance.js')).rejects.toThrow(/architecture-utils/i);
  });
});
