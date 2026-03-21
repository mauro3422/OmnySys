import { describe, expect, it } from 'vitest';

import {
  METADATA_SURFACE_MODE,
  extractFileMetadataMap,
  extractMetadataSurface
} from '#layer-a/pipeline/metadata-gateway.js';

describe('metadata gateway', () => {
  it('marks file surfaces explicitly and preserves canonical file path metadata', async () => {
    const metadata = await extractMetadataSurface({
      mode: METADATA_SURFACE_MODE.FILE,
      filePath: 'src/shared/compiler/index.js',
      code: 'export const value = 1;'
    });

    expect(metadata.surfaceKind).toBe(METADATA_SURFACE_MODE.FILE);
    expect(metadata.metadataSurface.kind).toBe(METADATA_SURFACE_MODE.FILE);
    expect(metadata.metadataSurface.source).toBe('extractAllMetadata');
    expect(metadata.filePath).toBe('src/shared/compiler/index.js');
  });

  it('builds a batch map for multiple file surfaces', async () => {
    const metadataMap = await extractMetadataSurface({
      mode: METADATA_SURFACE_MODE.BATCH,
      fileSourceCode: {
        'src/a.js': 'export const a = 1;',
        'src/b.js': 'export function b() { return 2; }'
      }
    });

    expect(Object.keys(metadataMap)).toEqual(['src/a.js', 'src/b.js']);
    expect(metadataMap['src/a.js'].surfaceKind).toBe(METADATA_SURFACE_MODE.FILE);
    expect(metadataMap['src/b.js'].metadataSurface.kind).toBe(METADATA_SURFACE_MODE.FILE);
  });

  it('exposes the batch helper directly for canonical callers', async () => {
    const metadataMap = await extractFileMetadataMap({
      'src/c.js': 'export default function c() { return 3; }'
    });

    expect(metadataMap['src/c.js'].surfaceKind).toBe(METADATA_SURFACE_MODE.FILE);
    expect(metadataMap['src/c.js'].metadataSurface.providers).toContain(
      'layer-a-static/extractors/metadata/index.js'
    );
  });
});
