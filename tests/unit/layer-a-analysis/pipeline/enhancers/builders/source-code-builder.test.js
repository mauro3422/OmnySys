import { describe, it, expect } from 'vitest';
import {
  buildSourceCodeMap,
  readSourceFile,
  getRelativePath
} from '#layer-a/pipeline/enhancers/builders/source-code-builder.js';

describe('pipeline/enhancers/builders/source-code-builder.js', () => {
  it('exports source code builder functions', () => {
    expect(buildSourceCodeMap).toBeTypeOf('function');
    expect(readSourceFile).toBeTypeOf('function');
    expect(getRelativePath).toBeTypeOf('function');
  });

  it('returns null for unreadable source files', async () => {
    const data = await readSourceFile('C:/path/does/not/exist.js');
    expect(data).toBeNull();
  });

  it('normalizes relative paths', () => {
    const rel = getRelativePath('C:/repo/project', 'C:/repo/project/src/main.js');
    expect(rel).toBe('src/main.js');
  });
});
