/**
 * @fileoverview Shadow Registry Mocks
 * 
 * Mocks para tests de integración de Shadow Registry.
 * 
 * @module tests/integration/helpers/shadow-registry-mocks
 */

import { vi } from 'vitest';

export const createMockStorage = (mockStorage) => ({
  save: vi.fn().mockImplementation(async (shadow) => {
    mockStorage.set(shadow.shadowId, { ...shadow });
  }),
  load: vi.fn().mockImplementation(async (shadowId) => {
    return mockStorage.get(shadowId) || null;
  }),
  exists: vi.fn().mockImplementation(async (shadowId) => {
    return mockStorage.has(shadowId);
  })
});

export const createMockIndexManager = (mockIndex) => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  updateShadow: vi.fn().mockImplementation(async (shadow) => {
    mockIndex.set(shadow.shadowId, {
      shadowId: shadow.shadowId,
      status: shadow.status,
      flowType: shadow.dna?.flowType || 'sync'
    });
  }),
  getEntries: vi.fn().mockImplementation(async (filters = {}) => {
    let entries = Array.from(mockIndex.values());
    if (filters.status) {
      entries = entries.filter(e => e.status === filters.status);
    }
    return entries;
  })
});

export const createMockCache = (mockCache) => ({
  has: vi.fn().mockImplementation((id) => mockCache.has(id)),
  get: vi.fn().mockImplementation((id) => mockCache.get(id)),
  set: vi.fn().mockImplementation((id, value) => {
    mockCache.set(id, value);
  }),
  clear: vi.fn().mockImplementation(() => mockCache.clear())
});

export const createMockShadowRegistry = (mockStorage, mockIndex) => {
  let shadowCounter = 0;
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    createShadow: vi.fn().mockImplementation(async (atom, options) => {
      shadowCounter++;
      const { ShadowBuilder } = await import('../../factories/layer-c-shadow-registry/builders.js');
      const shadow = new ShadowBuilder()
        .withShadowId(`shadow_${shadowCounter}_${Date.now()}`)
        .withAtomId(atom.id)
        .withDNA(atom.dna)
        .withReason(options.reason || 'deleted')
        .build();
      mockStorage.set(shadow.shadowId, shadow);
      mockIndex.set(shadow.shadowId, { shadowId: shadow.shadowId, status: shadow.status });
      return shadow;
    }),
    getShadow: vi.fn().mockImplementation(async (id) => mockStorage.get(id) || null),
    findSimilar: vi.fn().mockResolvedValue([]),
    markReplaced: vi.fn().mockImplementation(async (shadowId, replacementId) => {
      const shadow = mockStorage.get(shadowId);
      if (shadow) {
        const { ShadowStatus } = await import('../../../src/layer-c-memory/shadow-registry/types.js');
        shadow.status = ShadowStatus.REPLACED;
        shadow.replacedBy = replacementId;
      }
    }),
    getLineage: vi.fn().mockResolvedValue([])
  };
};
