import { describe, it, expect } from 'vitest';

describe('pipeline/enhance/enhance.js', () => {
  it('fails import while architecture-utils legacy path remains unresolved', async () => {
    await expect(import('#layer-a/pipeline/enhance/enhance.js')).rejects.toThrow(/architecture-utils/i);
  });
});
