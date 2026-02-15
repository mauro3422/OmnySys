import { describe, it, expect } from 'vitest';
import { groupMoleculesByModule, extractModuleName, getModulePathForFile } from '../../../../../src/layer-a-static/module-system/groupers/module-grouper.js';

describe('module-system/groupers/module-grouper.js', () => {
  it('groups by first src module segment', () => {
    const groups = groupMoleculesByModule('/proj', [
      { filePath: '/proj/src/auth/login.js' },
      { filePath: '/proj/src/auth/logout.js' },
      { filePath: '/proj/src/users/get.js' }
    ]);
    expect(groups.size).toBe(2);
  });

  it('extracts module name from module path', () => {
    expect(extractModuleName('/proj/src/auth', '/proj')).toBe('src/auth');
  });

  it('gets module path for file', () => {
    expect(getModulePathForFile('/proj/src/auth/login.js', '/proj').replace(/\\/g, '/')).toContain('/proj/src/auth');
  });
});

