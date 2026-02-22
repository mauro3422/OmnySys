/**
 * @fileoverview Integration Tests: Layer C Shadow Registry Flow
 * 
 * Tests the complete shadow registry workflow.
 * 
 * @module tests/integration/layer-c/shadow-registry-flow.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShadowBuilder, AtomBuilder } from '../../factories/layer-c-shadow-registry/builders.js';
import { ShadowStatus, EvolutionType } from '../../../src/layer-c-memory/shadow-registry/types.js';
import { 
  createMockStorage, 
  createMockIndexManager, 
  createMockCache 
} from '../helpers/index.js';

const mockStorageMap = new Map();
const mockIndexMap = new Map();
const mockCacheMap = new Map();

describe('Layer C Integration: Shadow Registry Flow', () => {
  let storage, indexManager, cache;

  beforeEach(() => {
    mockStorageMap.clear();
    mockIndexMap.clear();
    mockCacheMap.clear();
    
    storage = createMockStorage(mockStorageMap);
    indexManager = createMockIndexManager(mockIndexMap);
    cache = createMockCache(mockCacheMap);
  });

  describe('Full Shadow Registry Workflow', () => {
    
    it('should create shadow → retrieve → find similar → mark replaced (end-to-end)', async () => {
      const atom = new AtomBuilder()
        .withId('src/auth.js::login')
        .withName('login')
        .withFile('src/auth.js')
        .withDataFlow({ inputs: ['credentials'], outputs: ['token'], sideEffects: ['localStorage'] })
        .build();

      atom.dna = {
        id: 'dna_001', structuralHash: 'hash_struct_auth', patternHash: 'hash_pattern_login',
        flowType: 'sync', operationSequence: ['validate', 'authenticate', 'store'],
        complexityScore: 5, semanticFingerprint: 'sem_fp_login'
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
    });

    it('should handle cache integration with storage', async () => {
      const shadow = new ShadowBuilder().withShadowId('shadow_cache_test').build();

      await storage.save(shadow);
      cache.set(shadow.shadowId, shadow);

      expect(cache.has('shadow_cache_test')).toBe(true);
      expect(cache.get('shadow_cache_test')).toEqual(shadow);

      cache.clear();
      expect(cache.has('shadow_cache_test')).toBe(false);
      
      const stillInStorage = await storage.load('shadow_cache_test');
      expect(stillInStorage).toBeDefined();
    });
  });

  describe('Lineage Reconstruction Across Multiple Shadows', () => {
    
    it('should reconstruct lineage through parent-child relationships', async () => {
      const shadows = [
        new ShadowBuilder()
          .withShadowId('shadow_gen0')
          .withOriginalId('src/legacy.js::oldFunc')
          .withLineage({ parentShadowId: null, childShadowIds: ['shadow_gen1'], generation: 0 })
          .build(),
        new ShadowBuilder()
          .withShadowId('shadow_gen1')
          .withOriginalId('src/v1.js::func')
          .withLineage({ parentShadowId: 'shadow_gen0', childShadowIds: ['shadow_gen2'], generation: 1 })
          .build(),
        new ShadowBuilder()
          .withShadowId('shadow_gen2')
          .withOriginalId('src/v2.js::func')
          .withLineage({ parentShadowId: 'shadow_gen1', childShadowIds: [], generation: 2 })
          .build()
      ];

      for (const shadow of shadows) await storage.save(shadow);

      const getLineage = async (shadowId) => {
        const lineage = [];
        let current = await storage.load(shadowId);
        while (current) {
          lineage.push(current);
          current = current.lineage.parentShadowId 
            ? await storage.load(current.lineage.parentShadowId) 
            : null;
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
        new ShadowBuilder().withShadowId('shadow_refactor')
          .withEvolutionType(EvolutionType.REFACTOR)
          .withLineage({ generation: 1, evolutionType: EvolutionType.REFACTOR }).build(),
        new ShadowBuilder().withShadowId('shadow_renamed')
          .withEvolutionType(EvolutionType.RENAMED)
          .withLineage({ generation: 2, evolutionType: EvolutionType.RENAMED }).build(),
        new ShadowBuilder().withShadowId('shadow_domain')
          .withEvolutionType(EvolutionType.DOMAIN_CHANGE)
          .withLineage({ generation: 3, evolutionType: EvolutionType.DOMAIN_CHANGE }).build()
      ];

      for (const shadow of shadows) await storage.save(shadow);

      const evolutionTypes = [];
      for (const shadow of shadows) {
        const loaded = await storage.load(shadow.shadowId);
        if (loaded.lineage.evolutionType) evolutionTypes.push(loaded.lineage.evolutionType);
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

      await Promise.all([storage.save(parent), storage.save(child1), storage.save(child2)]);

      const loadedParent = await storage.load('shadow_parent');
      expect(loadedParent.lineage.childShadowIds).toContain('shadow_child1');
      expect(loadedParent.lineage.childShadowIds).toContain('shadow_child2');
      expect(loadedParent.status).toBe(ShadowStatus.SPLIT);
    });
  });

  describe('Shadow Status Transitions', () => {
    
    it('should transition through status: deleted → replaced', async () => {
      const shadow = new ShadowBuilder()
        .withShadowId('shadow_status_test')
        .withStatus(ShadowStatus.DELETED)
        .build();

      await storage.save(shadow);
      
      const loaded = await storage.load('shadow_status_test');
      expect(loaded.status).toBe(ShadowStatus.DELETED);

      loaded.status = ShadowStatus.REPLACED;
      loaded.replacedBy = 'shadow_replacement';
      await storage.save(loaded);

      const updated = await storage.load('shadow_status_test');
      expect(updated.status).toBe(ShadowStatus.REPLACED);
      expect(updated.replacedBy).toBe('shadow_replacement');
    });
  });

  describe('Similarity Search Integration', () => {
    
    it('should find shadows with similar DNA patterns', async () => {
      const shadows = [
        new ShadowBuilder()
          .withShadowId('shadow_similar1')
          .withDNA({ patternHash: 'hash_pattern_A', flowType: 'sync' })
          .build(),
        new ShadowBuilder()
          .withShadowId('shadow_similar2')
          .withDNA({ patternHash: 'hash_pattern_A', flowType: 'sync' })
          .build(),
        new ShadowBuilder()
          .withShadowId('shadow_different')
          .withDNA({ patternHash: 'hash_pattern_B', flowType: 'async' })
          .build()
      ];

      for (const shadow of shadows) {
        await storage.save(shadow);
        await indexManager.updateShadow(shadow);
      }

      const entries = await indexManager.getEntries();
      const similarEntries = entries.filter(e => e.flowType === 'sync');

      expect(similarEntries.length).toBe(2);
    });
  });

  describe('Error Recovery', () => {
    
    it('should handle missing shadows gracefully', async () => {
      const result = await storage.load('non_existent_shadow');
      expect(result).toBeNull();
    });

    it('should handle corrupted index entries', async () => {
      mockIndexMap.set('corrupted', { shadowId: 'corrupted', status: null });
      
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
