import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { saveRiskAssessment } from '#layer-a/storage/storage-manager/files/risks.js';
import { createDataDirectory } from '#layer-a/storage/storage-manager/setup/directory.js';

describe('storage/storage-manager/files/risks.js', () => {
  it('writes risk assessment file with generation timestamp', async () => {
    const root = path.join(process.cwd(), 'tmp-storage-risks');
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(root, { recursive: true });
    await createDataDirectory(root);

    const saved = await saveRiskAssessment(root, { highRiskFiles: [] });
    const parsed = JSON.parse(await fs.readFile(saved, 'utf8'));
    expect(parsed).toHaveProperty('generatedAt');
    expect(Array.isArray(parsed.highRiskFiles)).toBe(true);

    await fs.rm(root, { recursive: true, force: true });
  });
});

