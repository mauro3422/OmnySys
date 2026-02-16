import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  createDataDirectory,
  getDataDirectory,
  hasExistingAnalysis
} from '#layer-a/storage/storage-manager/setup/directory.js';

describe('storage/storage-manager/setup/directory.js', () => {
  it('creates data directory structure and detects existing index', async () => {
    const root = path.join(process.cwd(), 'tmp-storage-setup');
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(root, { recursive: true });

    const dataDir = await createDataDirectory(root);
    expect(dataDir).toBe(getDataDirectory(root));

    expect(await hasExistingAnalysis(root)).toBe(false);
    await fs.writeFile(path.join(dataDir, 'index.json'), '{}');
    expect(await hasExistingAnalysis(root)).toBe(true);

    await fs.rm(root, { recursive: true, force: true });
  });
});

