import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { saveMetadata } from '#layer-a/storage/storage-manager/files/metadata.js';

describe('storage/storage-manager/files/metadata.js', () => {
  it('writes partitioned metadata index file', async () => {
    const root = path.join(process.cwd(), 'tmp-storage-metadata');
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(root, { recursive: true });

    const indexPath = await saveMetadata(root, { project: 'x' }, { 'src/a.js': { hash: '123' } });
    const raw = await fs.readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('metadata.storageFormat', 'partitioned');
    expect(parsed.fileIndex['src/a.js']).toBeDefined();

    await fs.rm(root, { recursive: true, force: true });
  });
});

