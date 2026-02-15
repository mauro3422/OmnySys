import { describe, it, expect } from 'vitest';
import { extractHistoricalMetadata } from '#layer-a/extractors/metadata/historical-metadata.js';

describe('extractors/metadata/historical-metadata.js', () => {
  it('returns stable object shape even when git/file data is unavailable', () => {
    const out = extractHistoricalMetadata('definitely/missing/file.js');
    expect(out).toHaveProperty('commitCount');
    expect(out).toHaveProperty('lastModified');
    expect(out).toHaveProperty('contributors');
    expect(out).toHaveProperty('hotspotScore');
    expect(Array.isArray(out.contributors)).toBe(true);
  });
});

