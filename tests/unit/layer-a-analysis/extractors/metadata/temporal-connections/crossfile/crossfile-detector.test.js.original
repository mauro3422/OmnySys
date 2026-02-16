import { describe, it, expect } from 'vitest';
import {
  extractCrossFileConnections,
  findProviderFiles,
  findConsumerFiles
} from '#layer-a/extractors/metadata/temporal-connections/crossfile/crossfile-detector.js';

describe('extractors/metadata/temporal-connections/crossfile/crossfile-detector.js', () => {
  it('identifies provider and consumer files from atoms', () => {
    const atoms = [
      { id: 'p1', name: 'initConfig', filePath: 'a/init.js', temporal: { executionOrder: { mustRunBefore: [{ reason: 'init' }] } } },
      { id: 'c1', name: 'useConfig', filePath: 'b/use.js', temporal: { executionOrder: { mustRunAfter: [{ reason: 'consume' }] } } }
    ];
    expect(findProviderFiles(atoms)).toContain('a/init.js');
    expect(findConsumerFiles(atoms)).toContain('b/use.js');
  });

  it('creates cross-file temporal connections when import relationship exists', () => {
    const atoms = [
      {
        id: 'p1',
        name: 'initConfig',
        filePath: 'src/config/init.js',
        temporal: { executionOrder: { mustRunBefore: [{ reason: 'init' }] } },
        imports: []
      },
      {
        id: 'c1',
        name: 'useConfig',
        filePath: 'src/app/use.js',
        temporal: { executionOrder: { mustRunAfter: [{ reason: 'consume' }] } },
        imports: [{ source: 'src/config/init' }]
      }
    ];
    const out = extractCrossFileConnections(atoms);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].type).toBe('cross-file-temporal');
  });
});
