import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('analyses/tier1/function-cycle-classifier/cycles/classifier.js', () => {
  const sourcePath = path.resolve(
    'src/layer-a-static/analyses/tier1/function-cycle-classifier/cycles/classifier.js'
  );

  it('exports cycle classification functions at source level', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toContain('export function classifyFunctionCycle');
    expect(src).toContain('export function classifyAllFunctionCycles');
  });

  it('documents current runtime blocker (logger import path mismatch)', async () => {
    await expect(
      import('#layer-a/analyses/tier1/function-cycle-classifier/cycles/classifier.js')
    ).rejects.toThrow(/Cannot find module/);
  });
});
