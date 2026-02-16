import { describe, it, expect } from 'vitest';

describe('pipeline/enhance/builders/index.js', () => {
  it('fails import while architecture-utils relative path is broken (real blocker)', async () => {
    await expect(import('#layer-a/pipeline/enhance/builders/index.js')).rejects.toThrow(/architecture-utils/i);
  });
});
