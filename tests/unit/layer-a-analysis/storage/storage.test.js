/**
 * @fileoverview Storage - Meta-Factory
 */

import { describe, it, expect } from 'vitest';
import * as storage from '#layer-a/storage/storage-manager/index.js';

describe('Storage', () => {
  it('storage is available', () => {
    expect(Object.keys(storage).length).toBeGreaterThan(0);
  });
});
