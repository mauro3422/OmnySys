import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/layer-a-static/shared/architecture-utils.js', () => ({
  detectGodObject: vi.fn(() => false),
  detectOrphanModule: vi.fn(() => false)
}));

vi.mock('../../../shared/architecture-utils.js', () => ({
  detectGodObject: vi.fn(() => false),
  detectOrphanModule: vi.fn(() => false)
}));

describe('pipeline/enhance.js', () => {
  it('exports compatibility wrapper API', async () => {
    const { default: enhanceDefault, generateEnhancedSystemMap } = await import('#layer-a/pipeline/enhance.js');
    expect(generateEnhancedSystemMap).toBeTypeOf('function');
    expect(enhanceDefault).toBeTypeOf('function');
  });

  it('keeps default export aligned with main generator', async () => {
    const { default: enhanceDefault, generateEnhancedSystemMap } = await import('#layer-a/pipeline/enhance.js');
    expect(enhanceDefault).toBe(generateEnhancedSystemMap);
  });
});
