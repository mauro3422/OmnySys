import { describe, it, expect } from 'vitest';
import { analyzeFile, analyzeAllFiles } from '#layer-a/pipeline/enhance/analyzers/file-analyzer.js';

describe('pipeline/enhance/analyzers/file-analyzer.js', () => {
  it('exports file analyzer functions', () => {
    expect(analyzeFile).toBeTypeOf('function');
    expect(analyzeAllFiles).toBeTypeOf('function');
  });

  it('analyzeFile returns analyzed structure or safe fallback', () => {
    const fileInfo = { exports: [], imports: [] };
    const result = analyzeFile('src/a.js', 'const x = 1;', fileInfo);
    expect(result).toBeTypeOf('object');
    expect(result).toHaveProperty('exports');
  });

  it('analyzeAllFiles handles empty file map', async () => {
    const out = await analyzeAllFiles({}, 'C:/repo');
    expect(out).toHaveProperty('enhancedFiles');
    expect(out).toHaveProperty('allSideEffects');
    expect(out).toHaveProperty('fileSourceCode');
  });
});
