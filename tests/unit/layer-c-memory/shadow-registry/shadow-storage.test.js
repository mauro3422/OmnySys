/**
 * @fileoverview Tests for shadow storage
 * @module tests/unit/layer-c-memory/shadow-registry/shadow-storage.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ShadowStorage, IndexManager } from '#layer-c/shadow-registry/storage/index.js';
import { ShadowBuilder } from '#test-factories/layer-c-shadow-registry';
import fs from 'fs/promises';
import path from 'path';

const testStoragePath = path.join(process.cwd(), '.test-shadow-storage');

describe('ShadowStorage', () => {
  let storage;

  beforeEach(async () => {
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch {}
    
    await fs.mkdir(testStoragePath, { recursive: true });
    storage = new ShadowStorage(testStoragePath);
  });

  afterEach(async () => {
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch {}
  });

  describe('Structure Contract', () => {
    it('MUST export ShadowStorage class', () => {
      expect(ShadowStorage).toBeDefined();
      expect(typeof ShadowStorage).toBe('function');
    });

    it('MUST have required methods', () => {
      expect(typeof storage.save).toBe('function');
      expect(typeof storage.load).toBe('function');
      expect(typeof storage.exists).toBe('function');
      expect(typeof storage.delete).toBe('function');
    });
  });

  describe('save()', () => {
    it('saves shadow to disk', async () => {
      const shadow = ShadowBuilder.create()
        .withShadowId('shadow_test123')
        .build();

      await storage.save(shadow);

      const filePath = path.join(testStoragePath, 'shadow_test123.json');
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('creates valid JSON file', async () => {
      const shadow = ShadowBuilder.create()
        .withShadowId('shadow_json_test')
        .withOriginalId('src/test.js::func')
        .build();

      await storage.save(shadow);

      const filePath = path.join(testStoragePath, 'shadow_json_test.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.shadowId).toBe('shadow_json_test');
      expect(parsed.originalId).toBe('src/test.js::func');
    });

    it('overwrites existing shadow', async () => {
      const shadow1 = ShadowBuilder.create()
        .withShadowId('shadow_overwrite')
        .withStatus('deleted')
        .build();

      await storage.save(shadow1);

      const shadow2 = ShadowBuilder.create()
        .withShadowId('shadow_overwrite')
        .withStatus('replaced')
        .build();

      await storage.save(shadow2);

      const loaded = await storage.load('shadow_overwrite');
      expect(loaded.status).toBe('replaced');
    });
  });

  describe('load()', () => {
    it('loads existing shadow', async () => {
      const shadow = ShadowBuilder.create()
        .withShadowId('shadow_load_test')
        .build();

      await storage.save(shadow);
      const loaded = await storage.load('shadow_load_test');

      expect(loaded).toBeDefined();
      expect(loaded.shadowId).toBe('shadow_load_test');
    });

    it('returns null for non-existent shadow', async () => {
      const loaded = await storage.load('shadow_nonexistent');

      expect(loaded).toBeNull();
    });

    it('preserves all shadow properties', async () => {
      const shadow = ShadowBuilder.create()
        .withShadowId('shadow_full_test')
        .withOriginalId('src/full.js::fullFunc')
        .withDNA({
          structuralHash: 'hash123',
          patternHash: 'pattern456',
          flowType: 'async'
        })
        .withLineage({ generation: 3 })
        .withInheritance({ vibrationScore: 85 })
        .build();

      await storage.save(shadow);
      const loaded = await storage.load('shadow_full_test');

      expect(loaded.originalId).toBe('src/full.js::fullFunc');
      expect(loaded.dna.structuralHash).toBe('hash123');
      expect(loaded.dna.patternHash).toBe('pattern456');
      expect(loaded.dna.flowType).toBe('async');
      expect(loaded.lineage.generation).toBe(3);
      expect(loaded.inheritance.vibrationScore).toBe(85);
    });
  });

  describe('exists()', () => {
    it('returns true for existing shadow', async () => {
      const shadow = ShadowBuilder.create()
        .withShadowId('shadow_exists_test')
        .build();

      await storage.save(shadow);
      const exists = await storage.exists('shadow_exists_test');

      expect(exists).toBe(true);
    });

    it('returns false for non-existent shadow', async () => {
      const exists = await storage.exists('shadow_nonexistent');

      expect(exists).toBe(false);
    });
  });

  describe('delete()', () => {
    it('removes shadow from disk', async () => {
      const shadow = ShadowBuilder.create()
        .withShadowId('shadow_delete_test')
        .build();

      await storage.save(shadow);
      await storage.delete('shadow_delete_test');

      const exists = await storage.exists('shadow_delete_test');
      expect(exists).toBe(false);
    });

    it('handles missing files gracefully', async () => {
      await expect(storage.delete('shadow_nonexistent')).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles missing shadowsPath gracefully', async () => {
      const badStorage = new ShadowStorage('/nonexistent/path');

      await expect(badStorage.save({ shadowId: 'test' })).rejects.toThrow();
    });
  });
});

describe('IndexManager', () => {
  let indexManager;
  const indexPath = path.join(testStoragePath, 'index.json');

  beforeEach(async () => {
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch {}
    
    await fs.mkdir(testStoragePath, { recursive: true });
    indexManager = new IndexManager(indexPath);
  });

  afterEach(async () => {
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch {}
  });

  describe('Structure Contract', () => {
    it('MUST export IndexManager class', () => {
      expect(IndexManager).toBeDefined();
      expect(typeof IndexManager).toBe('function');
    });

    it('MUST have required methods', () => {
      expect(typeof indexManager.initialize).toBe('function');
      expect(typeof indexManager.load).toBe('function');
      expect(typeof indexManager.save).toBe('function');
      expect(typeof indexManager.updateShadow).toBe('function');
      expect(typeof indexManager.getEntries).toBe('function');
    });
  });

  describe('initialize()', () => {
    it('creates index file if not exists', async () => {
      await indexManager.initialize();

      const exists = await fs.access(indexPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('preserves existing index', async () => {
      await indexManager.initialize();
      await indexManager.updateShadow({ shadowId: 'test', status: 'deleted' });

      await indexManager.initialize();

      const index = await indexManager.load();
      expect(index.shadows.test).toBeDefined();
    });
  });

  describe('save() and load()', () => {
    it('saves and loads index correctly', async () => {
      await indexManager.save({ shadows: {}, lineages: {} });
      const index = await indexManager.load();

      expect(index.shadows).toEqual({});
      expect(index.lineages).toEqual({});
    });

    it('preserves data through save/load cycle', async () => {
      const testData = {
        shadows: { shadow1: { shadowId: 'shadow1' } },
        lineages: { parent1: ['child1'] }
      };

      await indexManager.save(testData);
      const loaded = await indexManager.load();

      expect(loaded.shadows.shadow1.shadowId).toBe('shadow1');
      expect(loaded.lineages.parent1).toEqual(['child1']);
    });
  });

  describe('updateShadow()', () => {
    it('adds new shadow entry', async () => {
      await indexManager.initialize();
      
      const shadow = {
        shadowId: 'shadow_new',
        originalId: 'src/test.js::func',
        status: 'deleted',
        dna: { flowType: 'sync', patternHash: 'hash123' },
        lineage: { generation: 1 }
      };

      await indexManager.updateShadow(shadow);

      const index = await indexManager.load();
      expect(index.shadows.shadow_new).toBeDefined();
      expect(index.shadows.shadow_new.status).toBe('deleted');
    });

    it('updates existing shadow entry', async () => {
      await indexManager.initialize();
      
      await indexManager.updateShadow({ shadowId: 'shadow_update', status: 'deleted' });
      await indexManager.updateShadow({ shadowId: 'shadow_update', status: 'replaced', replacedBy: 'newId' });

      const index = await indexManager.load();
      expect(index.shadows.shadow_update.status).toBe('replaced');
      expect(index.shadows.shadow_update.replacedBy).toBe('newId');
    });
  });

  describe('getEntries()', () => {
    beforeEach(async () => {
      await indexManager.initialize();
      
      await indexManager.updateShadow({ shadowId: 's1', status: 'deleted', dna: { flowType: 'sync' } });
      await indexManager.updateShadow({ shadowId: 's2', status: 'replaced', dna: { flowType: 'sync' } });
      await indexManager.updateShadow({ shadowId: 's3', status: 'deleted', dna: { flowType: 'async' } });
    });

    it('returns all entries without filters', async () => {
      const entries = await indexManager.getEntries();

      expect(entries.length).toBe(3);
    });

    it('filters by status', async () => {
      const deleted = await indexManager.getEntries({ status: 'deleted' });

      expect(deleted.length).toBe(2);
      expect(deleted.every(e => e.status === 'deleted')).toBe(true);
    });

    it('filters by flowType', async () => {
      const asyncEntries = await indexManager.getEntries({ flowType: 'async' });

      expect(asyncEntries.length).toBe(1);
      expect(asyncEntries[0].flowType).toBe('async');
    });

    it('combines filters', async () => {
      const entries = await indexManager.getEntries({ 
        status: 'deleted', 
        flowType: 'sync' 
      });

      expect(entries.length).toBe(1);
    });
  });

  describe('getAllShadowIds()', () => {
    it('returns all shadow IDs', async () => {
      await indexManager.initialize();
      
      await indexManager.updateShadow({ shadowId: 'id1' });
      await indexManager.updateShadow({ shadowId: 'id2' });
      await indexManager.updateShadow({ shadowId: 'id3' });

      const ids = await indexManager.getAllShadowIds();

      expect(ids).toContain('id1');
      expect(ids).toContain('id2');
      expect(ids).toContain('id3');
    });

    it('returns empty array when no shadows', async () => {
      await indexManager.initialize();

      const ids = await indexManager.getAllShadowIds();

      expect(ids).toEqual([]);
    });
  });
});
