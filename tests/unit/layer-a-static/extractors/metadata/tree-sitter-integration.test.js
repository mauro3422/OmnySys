import { describe, expect, it } from 'vitest';

import { extractTreeSitterMetadata } from '#layer-a/extractors/metadata/tree-sitter-integration.js';

describe('tree-sitter integration', () => {
  it('returns atom-scoped side effects from the canonical side effect extractor', async () => {
    const code = `
export function demo() {
  fetch('/api/demo');
  window.addEventListener('click', () => {});
  console.log('demo');
}
`;

    const metadata = await extractTreeSitterMetadata(
      code,
      { line: 1, endLine: 8 },
      'src/demo.js',
      code
    );

    expect(Array.isArray(metadata.sideEffects)).toBe(true);
    expect(metadata.sideEffects.length).toBeGreaterThan(0);
    expect(metadata.sideEffects.some((effect) => effect.type === 'fetch')).toBe(true);
  });
});
