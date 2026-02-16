/**
 * @fileoverview Module System
 */

import { describe, it, expect } from 'vitest';

describe('Module System', () => {
  it('module system exports are available', async () => {
    const moduleSystem = await import('#layer-a/module-system/index.js');
    expect(Object.keys(moduleSystem).length).toBeGreaterThan(0);
  });
  
  it('module system has callable functions', async () => {
    const moduleSystem = await import('#layer-a/module-system/index.js');
    const firstFn = Object.values(moduleSystem)[0];
    expect(typeof firstFn).toBe('function');
  });
});
