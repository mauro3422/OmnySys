import { describe, it, expect } from 'vitest';
import {
  buildSourceCodeMap,
  readSourceFile,
  getRelativePath
} from '#layer-a/pipeline/enhancers/builders/index.js';

describe('pipeline/enhancers/builders/index.js', () => {
  it('exports source-code builder contract', () => {
    expect(buildSourceCodeMap).toBeTypeOf('function');
    expect(readSourceFile).toBeTypeOf('function');
    expect(getRelativePath).toBeTypeOf('function');
  });

  it('getRelativePath normalizes and trims project root', () => {
    const rel = getRelativePath('C:/repo/project', 'C:/repo/project/src/a.js');
    expect(rel).toBe('src/a.js');
  });
});
