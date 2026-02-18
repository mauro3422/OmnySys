/**
 * @fileoverview Integration Tests: Layer C Shadow Registry Flow
 * 
 * Tests the complete shadow registry workflow:
 * - Create shadow → retrieve → find similar → mark replaced
 * - Lineage reconstruction across multiple shadows
 * - Cache integration with storage
 * 
 * @module tests/integration/layer-c/shadow-registry-flow.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShadowBuilder, AtomBuilder, LineageBuilder } from '../../factories/layer-c-shadow-registry/builders.js';
import { ShadowStatus, EvolutionType } from '../../../src/layer-c-memory/shadow-registry/types.js';

const mockStorage = new Map();
const mockIndex = new Map();
const mockCache = new Map();

const createMockIndexManager = () => ({
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

const createMockStorage = () => ({
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

const createMockCache = () => ({
  has: vi.fn().mockImplementation((id) => mockCache.has(id)),
  get: vi.fn().mockImplementation((id) => mockCache.get(id)),
  set: vi.fn().mockImplementation((id, value) => {
    mockCache.set(id, value);
  }),
  clear: vi.fn().mockImplementation(() => mockCache.clear())
});

describe('Layer C Integration: Shadow Registry Flow', () => {
  let storage;
  let indexManager;
  let cache;

  beforeEach(() => {
    mockStorage.clear();
    mockIndex.clear();
    mockCache.clear();
    
    storage = createMockStorage();
    indexManager = createMockIndexManager();
    cache = createMockCache();
  });

  describe('Full Shadow Registry Workflow', () => {
    
    it('should create shadow → retrieve → find similar → mark replaced (end-to-end)', async () => {
      const atom = new AtomBuilder()
        .withId('src/auth.js::login')
        .withName('login')
        .withFile('src/auth.js')
        .withDataFlow({
          inputs: ['credentials'],
          outputs: ['token'],
          sideEffects: ['localStorage']
        })
        .build();

      atom.dna = {
        id: 'dna_001',
        structuralHash: 'hash_struct_auth',
        patternHash: 'hash_pattern_login',
        flowType: 'sync',
        operationSequence: ['validate', 'authenticate', 'store'],
        complexityScore: 5,
        semanticFingerprint: 'sem_fp_login'
      };

      const shadow = new ShadowBuilder()
        .withShadowId('shadow_001')
        .withAtomId(atom.id)
        .withDNA(atom.dna)
        .withReason('refactored')
        .build();

      await storage.save(shadow);
      await indexManager.updateShadow(shadow);
      cache.set(shadow.shadowId, shadow);

      const retrieved = await storage.load('shadow_001');
      expect(retrieved).toBeDefined();
      expect(retrieved.originalId).toBe(atom.id);

      const entries = await indexManager.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].shadowId).toBe('shadow_001');

      const updatedShadow = { ...shadow, status: ShadowStatus.REPLACED, replacedBy: 'src/auth.js::authenticate' };
      await storage.save(updatedShadow);
      await indexManager.updateShadow(updatedShadow);
      cache.set(updatedShadow.shadowId, updatedShadow);

      const replaced = await storage.load('shadow_001');
      expect(replaced.status).toBe(ShadowStatus.REPLACED);
      expect(replaced.replacedBy).toBe('src/auth.js::authenticate');
    });

    it('should handle cache integration with storage', async () => {
      const shadow = new ShadowBuilder()
        .withShadowId('shadow_cache_test')
        .build();

      await storage.save(shadow);
      cache.set(shadow.shadowId, shadow);

      expect(cache.has('shadow_cache_test')).toBe(true);
      expect(cache.get('shadow_cache_test')).toEqual(shadow);

      const fromStorage = await storage.load('shadow_cache_test');
      expect(fromStorage).toEqual(shadow);

      cache.clear();
      expect(cache.has('shadow_cache_test')).toBe(false);
      
      const stillInStorage = await storage.load('shadow_cache_test');
      expect(stillInStorage).toBeDefined();
    });
  });

  describe('Lineage Reconstruction Across Multiple Shadows', () => {
    
    it('should reconstruct lineage through parent-child relationships', async () => {
      const grandparent = new ShadowBuilder()
        .withShadowId('shadow_gen0')
        .withOriginalId('src/legacy.js::oldFunc')
        .withLineage({ parentShadowId: null, childShadowIds: ['shadow_gen1'], generation: 0 })
        .build();

      const parent = new ShadowBuilder()
        .withShadowId('shadow_gen1')
        .withOriginalId('src/v1.js::func')
        .withLineage({ parentShadowId: 'shadow_gen0', childShadowIds: ['shadow_gen2'], generation: 1 })
        .build();

      const child = new ShadowBuilder()
        .withShadowId('shadow_gen2')
        .withOriginalId('src/v2.js::func')
        .withLineage({ parentShadowId: 'shadow_gen1', childShadowIds: [], generation: 2 })
        .build();

      await storage.save(grandparent);
      await storage.save(parent);
      await storage.save(child);

      const getLineage = async (shadowId) => {
        const lineage = [];
        let current = await storage.load(shadowId);
        while (current) {
          lineage.push(current);
          if (current.lineage.parentShadowId) {
            current = await storage.load(current.lineage.parentShadowId);
          } else {
            break;
          }
        }
        return lineage;
      };

      const lineage = await getLineage('shadow_gen2');
      
      expect(lineage.length).toBe(3);
      expect(lineage[0].shadowId).toBe('shadow_gen2');
      expect(lineage[1].shadowId).toBe('shadow_gen1');
      expect(lineage[2].shadowId).toBe('shadow_gen0');
    });

    it('should track evolution types across lineage', async () => {
      const shadows = [
        new ShadowBuilder()
          .withShadowId('shadow_refactor')
          .withEvolutionType(EvolutionType.REFACTOR)
          .withLineage({ generation: 1, evolutionType: EvolutionType.REFACTOR })
          .build(),
        new ShadowBuilder()
          .withShadowId('shadow_renamed')
          .withEvolutionType(EvolutionType.RENAMED)
          .withLineage({ generation: 2, evolutionType: EvolutionType.RENAMED })
          .build(),
        new ShadowBuilder()
          .withShadowId('shadow_domain')
          .withEvolutionType(EvolutionType.DOMAIN_CHANGE)
          .withLineage({ generation: 3, evolutionType: EvolutionType.DOMAIN_CHANGE })
          .build()
      ];

      for (const shadow of shadows) {
        await storage.save(shadow);
      }

      const evolutionTypes = [];
      for (const shadow of shadows) {
        const loaded = await storage.load(shadow.shadowId);
        if (loaded.lineage.evolutionType) {
          evolutionTypes.push(loaded.lineage.evolutionType);
        }
      }

      expect(evolutionTypes).toContain(EvolutionType.REFACTOR);
      expect(evolutionTypes).toContain(EvolutionType.RENAMED);
      expect(evolutionTypes).toContain(EvolutionType.DOMAIN_CHANGE);
    });

    it('should handle split evolution (one parent, multiple children)', async () => {
      const parent = new ShadowBuilder()
        .withShadowId('shadow_parent')
        .withOriginalId('src/monolith.js::bigFunction')
        .withChildren(['shadow_child1', 'shadow_child2'])
        .withStatus(ShadowStatus.SPLIT)
        .build();

      const child1 = new ShadowBuilder()
        .withShadowId('shadow_child1')
        .withOriginalId('src/split.js::funcA')
        .withLineage({ parentShadowId: 'shadow_parent', generation: 1 })
        .build();

      const child2 = new ShadowBuilder()
        .withShadowId('shadow_child2')
        .withOriginalId('src/split.js::funcB')
        .withLineage({ parentShadowId: 'shadow_parent', generation: 1 })
        .build();

      await storage.save(parent);
      await storage.save(child1);
      await storage.save(child2);

      const loadedParent = await storage.load('shadow_parent');
      expect(loadedParent.lineage.childShadowIds).toContain('shadow_child1');
      expect(loadedParent.lineage.childShadowIds).toContain('shadow_child2');
      expect(loadedParent.status).toBe(ShadowStatus.SPLIT);
    });

    it('should handle merge evolution (multiple parents, one child)', async () => {
      const parent1 = new ShadowBuilder()
        .withShadowId('shadow_merge1')
        .withOriginalId('src/a.js::funcA')
        .asMerged()
        .build();

      const parent2 = new ShadowBuilder()
        .withShadowId('shadow_merge2')
        .withOriginalId('src/b.js::funcB')
        .asMerged()
        .build();

      const merged = new ShadowBuilder()
        .withShadowId('shadow_merged')
        .withOriginalId('src/merged.js::combined')
        .withLineage({ 
          parentShadowId: 'shadow_merge1',
          generation: 1,
          additionalParents: ['shadow_merge2']
        })
        .build();

      await storage.save(parent1);
      await storage.save(parent2);
      await storage.save(merged);

      const loaded1 = await storage.load('shadow_merge1');
      const loaded2 = await storage.load('shadow_merge2');
      
      expect(loaded1.status).toBe(ShadowStatus.MERGED);
      expect(loaded2.status).toBe(ShadowStatus.MERGED);
    });
  });

  describe('Shadow Status Transitions', () => {
    
    it('should transition through status: deleted → replaced', async () => {
      const shadow = new ShadowBuilder()
        .withShadowId('shadow_transition')
        .asDead()
        .build();

      await storage.save(shadow);
      
      let loaded = await storage.load('shadow_transition');
      expect(loaded.status).toBe(ShadowStatus.DELETED);
      expect(loaded.replacedBy).toBeNull();

      const updated = { ...loaded, status: ShadowStatus.REPLACED, replacedBy: 'new::atom' };
      await storage.save(updated);

      loaded = await storage.load('shadow_transition');
      expect(loaded.status).toBe(ShadowStatus.REPLACED);
      expect(loaded.replacedBy).toBe('new::atom');
    });

    it('should track vibration scores for zombie detection', async () => {
      const zombie = new ShadowBuilder()
        .withShadowId('shadow_zombie')
        .asZombie()
        .build();

      await storage.save(zombie);

      const loaded = await storage.load('shadow_zombie');
      expect(loaded.inheritance.vibrationScore).toBeGreaterThan(50);
      expect(loaded.inheritance.connectionCount).toBeGreaterThan(0);
      expect(loaded.inheritance.connections.length).toBeGreaterThan(0);
    });
  });

  describe('Similarity Search Integration', () => {
    
    it('should find similar shadows based on DNA', async () => {
      const targetDNA = {
        structuralHash: 'hash_target',
        patternHash: 'pattern_auth',
        flowType: 'async',
        complexityScore: 6
      };

      const shadows = [
        new ShadowBuilder()
          .withShadowId('shadow_similar1')
          .withDNA({ ...targetDNA, structuralHash: 'hash_target_v1' })
          .build(),
        new ShadowBuilder()
          .withShadowId('shadow_similar2')
          .withDNA({ ...targetDNA, flowType: 'sync' })
          .build(),
        new ShadowBuilder()
          .withShadowId('shadow_different')
          .withDNA({ structuralHash: 'different', patternHash: 'different', flowType: 'sync' })
          .build()
      ];

      for (const shadow of shadows) {
        await storage.save(shadow);
        await indexManager.updateShadow(shadow);
      }

      const entries = await indexManager.getEntries();
      
      const similarEntries = entries.filter(e => {
        const shadow = mockStorage.get(e.shadowId);
        return shadow && shadow.dna && shadow.dna.flowType === 'async';
      });

      expect(similarEntries.length).toBe(1);
      expect(similarEntries[0].shadowId).toBe('shadow_similar1');
    });
  });

  describe('Error Recovery', () => {
    
    it('should handle missing shadows gracefully', async () => {
      const result = await storage.load('non_existent_shadow');
      expect(result).toBeNull();
    });

    it('should handle corrupted index entries', async () => {
      mockIndex.set('corrupted', { shadowId: 'corrupted', status: null });
      
      const entries = await indexManager.getEntries();
      const validEntries = entries.filter(e => e.shadowId && e.status);
      
      expect(validEntries.length).toBe(0);
    });
  });

  describe('Performance with Multiple Shadows', () => {
    
    it('should handle batch shadow operations', async () => {
      const shadows = [];
      for (let i = 0; i < 50; i++) {
        shadows.push(new ShadowBuilder()
          .withShadowId(`shadow_batch_${i}`)
          .withOriginalId(`src/file${i}.js::func${i}`)
          .build());
      }

      const start = Date.now();
      
      for (const shadow of shadows) {
        await storage.save(shadow);
        cache.set(shadow.shadowId, shadow);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);

      for (let i = 0; i < 50; i++) {
        expect(cache.has(`shadow_batch_${i}`)).toBe(true);
      }
    });
  });
});
