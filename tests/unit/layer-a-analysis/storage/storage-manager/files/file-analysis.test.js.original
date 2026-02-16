import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { saveFileAnalysis } from '#layer-a/storage/storage-manager/files/file-analysis.js';

describe('storage/storage-manager/files/file-analysis.js', () => {
  it('saves file analysis and preserves previous llmInsights when omitted', async () => {
    const root = path.join(process.cwd(), 'tmp-storage-file-analysis');
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(root, { recursive: true });

    const relPath = 'src/a.js';
    await saveFileAnalysis(root, relPath, { llmInsights: { summary: 'old' }, riskScore: { severity: 'high' } });
    const savedPath = await saveFileAnalysis(root, relPath, { exports: [] });

    const parsed = JSON.parse(await fs.readFile(savedPath, 'utf8'));
    expect(parsed.llmInsights.summary).toBe('old');
    expect(parsed.riskScore.severity).toBe('high');

    await fs.rm(root, { recursive: true, force: true });
  });
});

