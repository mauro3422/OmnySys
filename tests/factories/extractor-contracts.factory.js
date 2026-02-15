import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Extractor direct contracts runner.
 * Enforces a consistent baseline contract for extractor modules.
 */
export function runExtractorContracts({ sourceRelativePath, expectedRuntimeError = null }) {
  const normalized = sourceRelativePath.replace(/\\/g, '/');
  const sourcePath = path.resolve('src/layer-a-static', normalized);

  it('Structure Contract: source exists and exports API', () => {
    expect(fs.existsSync(sourcePath)).toBe(true);
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source.length).toBeGreaterThan(0);
    expect(/(^|\n)\s*export\s/m.test(source)).toBe(true);
  });

  it('Runtime Contract: module loads without loader errors', async () => {
    if (expectedRuntimeError) {
      await expect(import(pathToFileURL(sourcePath).href)).rejects.toThrow(expectedRuntimeError);
      return;
    }

    const mod = await import(pathToFileURL(sourcePath).href);
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });

  it('SSOT Contract: mapped inside extractors namespace', () => {
    expect(normalized.startsWith('extractors/')).toBe(true);
  });
}
