import { describe, it, expect } from 'vitest';

describe('pipeline/enhance/builders/system-map-builder.js', () => {
  it('fails import while architecture-utils legacy path is unresolved', async () => {
    await expect(import('#layer-a/pipeline/enhance/builders/system-map-builder.js')).rejects.toThrow(/architecture-utils/i);
  });
});
