import { describe, it, expect } from 'vitest';
import { groupMoleculesByModule, extractModuleName, getModulePathForFile } from '../../../../../src/layer-a-static/module-system/groupers/module-grouper.js';

describe('module-system/groupers/index.js', () => {
  it('re-exports grouping API', () => {
    expect(typeof groupMoleculesByModule).toBe('function');
    expect(typeof extractModuleName).toBe('function');
    expect(typeof getModulePathForFile).toBe('function');
  });
});

