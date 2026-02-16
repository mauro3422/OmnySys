import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('module-system/__tests__/utils.test.js', () => {
  it('exists as source-level test artifact with utility coverage intent', () => {
    const p = path.resolve('src/layer-a-static/module-system/__tests__/utils.test.js');
    expect(fs.existsSync(p)).toBe(true);
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toContain('findMolecule');
    expect(src).toContain('aggregateSideEffects');
  });
});

