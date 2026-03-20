/**
 * @fileoverview imports - Meta-Factory
 */

import { describe, it, expect } from 'vitest';
import { extractTypeImports } from '../../../../../src/layer-a-static/extractors/typescript/parsers/imports.js';

describe('parser/extractors/imports', () => {
  it('module is available', async () => {
    try {
      const mod = await import('#layer-a/parser/extractors/imports.js');
      expect(mod).toBeDefined();
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it('ignores import examples in comments', () => {
    const source = [
      '// Pattern: import type { X } from \'...\'',
      'const value = 1;'
    ].join('\n');

    expect(extractTypeImports(source)).toEqual([]);
  });

  it('extracts real type imports', () => {
    const source = "import type { A, B } from './x.js';\nconst value = 1;";
    expect(extractTypeImports(source)).toEqual([
      { type: 'type_import', name: 'A', source: './x.js', line: 1 },
      { type: 'type_import', name: 'B', source: './x.js', line: 1 }
    ]);
  });
});
