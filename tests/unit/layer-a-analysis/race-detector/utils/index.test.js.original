import { describe, it, expect } from 'vitest';
import {
  findAtomById,
  extractQueueName,
  isSharedStateVariable,
  isJavaScriptKeyword
} from '#layer-a/race-detector/utils/index.js';

describe('race-detector/utils/index.js', () => {
  it('exports utility functions', () => {
    expect(findAtomById).toBeTypeOf('function');
    expect(extractQueueName).toBeTypeOf('function');
    expect(isSharedStateVariable).toBeTypeOf('function');
    expect(isJavaScriptKeyword).toBeTypeOf('function');
  });

  it('finds atom by id and parses queue names', () => {
    const project = {
      modules: [{
        files: [{
          filePath: 'src/a.js',
          atoms: [{ id: 'src/a.js::run', name: 'run' }]
        }]
      }]
    };

    expect(findAtomById('src/a.js::run', project)?.name).toBe('run');
    expect(extractQueueName('const queue = workQueue')).toBe('workQueue');
    expect(isSharedStateVariable('window.shared')).toBe(true);
    expect(isJavaScriptKeyword('const')).toBe(true);
  });
});
