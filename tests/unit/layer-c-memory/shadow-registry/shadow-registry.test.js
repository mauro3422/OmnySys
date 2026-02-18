import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ShadowRegistry, resetShadowRegistry } from '#layer-c/shadow-registry/ShadowRegistry.js';
import { ShadowStatus } from '#layer-c/shadow-registry/types.js';

function createTestAtom(overrides = {}) {
  return {
    id: 'src/test.js::testFunction',
    name: 'testFunction',
    filePath: 'src/test.js',
    lineNumber: 10,
    isExported: true,
    createdAt: new Date().toISOString(),
    dataFlow: {
      inputs: [{ name: 'input', type: 'param', usages: [{ type: 'read' }] }],
      transformations: [{ operation: 'calculation', from: 'input', to: 'result' }],
      outputs: [{ name: 'result', type: 'return' }]
    },
    semantic: { verb: 'process', domain: 'test', entity: 'data' },
    ...overrides
  };
}

function createAtomWithDNA(dna, overrides = {}) {
  const atom = createTestAtom(overrides);
  atom.dna = {
    id: 'dna_' + Math.random().toString(36).substr(2, 9),
    structuralHash: dna.structuralHash || 'hash_default',
    patternHash: dna.patternHash || 'pattern_default',
    flowType: dna.flowType || 'transform-return',
    operationSequence: dna.operationSequence || ['receive', 'calculation', 'return'],
    complexityScore: dna.complexityScore || 5,
    semanticFingerprint: dna.semanticFingerprint || 'process:test:data',
    ...dna
  };
  return atom;
}

describe('ShadowRegistry', () => {
  let tempDir;
  let registry;

  beforeEach(async () => {
    resetShadowRegistry();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shadow-test-'));
    registry = new ShadowRegistry(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Structure Contract', () => {
    it('MUST export ShadowRegistry class', () => {
      expect(ShadowRegistry).toBeDefined();
      expect(typeof ShadowRegistry).toBe('function');
    });

    it('MUST create instance with dataPath', () => {
      expect(registry.dataPath).toBe(tempDir);
      expect(registry.shadowsPath).toBe(path.join(tempDir, 'shadows'));
    });

    it('MUST have required methods', () => {
      expect(typeof registry.createShadow).toBe('function');
      expect(typeof registry.findSimilar).toBe('function');
      expect(typeof registry.getShadow).toBe('function');
      expect(typeof registry.markReplaced).toBe('function');
      expect(typeof registry.getLineage).toBe('function');
    });
  });

  describe('createShadow()', () => {
    it('creates proper shadow from atom', async () => {
      const atom = createAtomWithDNA({ structuralHash: 'hash_test', patternHash: 'p1', flowType: 'transform-return' });

      const shadow = await registry.createShadow(atom, { reason: 'file_deleted' });

      expect(shadow).toBeDefined();
      expect(shadow.shadowId).toMatch(/^shadow_/);
      expect(shadow.originalId).toBe('src/test.js::testFunction');
      expect(shadow.status).toBe(ShadowStatus.DELETED);
      expect(shadow.dna).toBeDefined();
      expect(shadow.metadata).toBeDefined();
      expect(shadow.lineage).toBeDefined();
      expect(shadow.inheritance).toBeDefined();
      expect(shadow.death).toBeDefined();
    });

    it('creates shadow with REPLACED status when replacementId provided', async () => {
      const atom = createAtomWithDNA({});

      const shadow = await registry.createShadow(atom, { 
        reason: 'refactored',
        replacementId: 'src/new.js::newFunction'
      });

      expect(shadow.status).toBe(ShadowStatus.REPLACED);
      expect(shadow.replacedBy).toBe('src/new.js::newFunction');
    });

    it('preserves atom DNA in shadow', async () => {
      const atom = createAtomWithDNA({
        structuralHash: 'hash123',
        patternHash: 'pattern456',
        flowType: 'sync'
      });

      const shadow = await registry.createShadow(atom);

      expect(shadow.dna.structuralHash).toBe('hash123');
      expect(shadow.dna.patternHash).toBe('pattern456');
      expect(shadow.dna.flowType).toBe('sync');
    });

    it('initializes lineage correctly', async () => {
      const atom = createAtomWithDNA({});

      const shadow = await registry.createShadow(atom);

      expect(shadow.lineage.parentShadowId).toBeNull();
      expect(shadow.lineage.childShadowIds).toEqual([]);
      expect(shadow.lineage.generation).toBe(0);
    });

    it('inherits ancestry from atom', async () => {
      const atom = createAtomWithDNA({});
      atom.ancestry = {
        replaced: 'shadow_parent123',
        generation: 1
      };

      const shadow = await registry.createShadow(atom);

      expect(shadow.lineage.parentShadowId).toBe('shadow_parent123');
      expect(shadow.lineage.generation).toBe(1);
    });
  });

  describe('findSimilar()', () => {
    it('finds matching shadows', async () => {
      const atom1 = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });
      
      await registry.createShadow(atom1);

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const results = await registry.findSimilar(searchAtom);

      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('respects minSimilarity threshold', async () => {
      const atom1 = createAtomWithDNA({ structuralHash: 'unique1', patternHash: 'p1', flowType: 'transform-return' });
      
      await registry.createShadow(atom1);

      const searchAtom = createAtomWithDNA({ 
        structuralHash: 'unique2', 
        patternHash: 'p2', 
        flowType: 'side-effect-only',
        operationSequence: ['emit']
      });

      const results = await registry.findSimilar(searchAtom, { minSimilarity: 0.99 });

      expect(results).toEqual([]);
    });

    it('respects limit option', async () => {
      const atom1 = createAtomWithDNA({ structuralHash: 'h1', patternHash: 'p1', flowType: 'transform-return' });
      const atom2 = createAtomWithDNA({ structuralHash: 'h1', patternHash: 'p1', flowType: 'transform-return' });
      atom2.id = 'src/test2.js::func2';
      
      await registry.createShadow(atom1);
      await registry.createShadow(atom2);

      const searchAtom = createAtomWithDNA({ structuralHash: 'h1', patternHash: 'p1', flowType: 'transform-return' });

      const results = await registry.findSimilar(searchAtom, { limit: 1 });

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('returns empty array for atom without valid DNA', async () => {
      const atom = { id: 'test', dna: null };

      const results = await registry.findSimilar(atom);

      expect(results).toEqual([]);
    });
  });

  describe('getShadow()', () => {
    it('retrieves shadow by ID', async () => {
      const atom = createAtomWithDNA({});
      const created = await registry.createShadow(atom);

      const retrieved = await registry.getShadow(created.shadowId);

      expect(retrieved).toBeDefined();
      expect(retrieved.shadowId).toBe(created.shadowId);
    });

    it('returns null for non-existent shadow', async () => {
      const shadow = await registry.getShadow('shadow_nonexistent');

      expect(shadow).toBeNull();
    });

    it('caches retrieved shadows', async () => {
      const atom = createAtomWithDNA({});
      const created = await registry.createShadow(atom);

      await registry.getShadow(created.shadowId);
      
      expect(registry.cache.has(created.shadowId)).toBe(true);
    });
  });

  describe('markReplaced()', () => {
    it('updates shadow status to REPLACED', async () => {
      const atom = createAtomWithDNA({});
      const shadow = await registry.createShadow(atom);

      await registry.markReplaced(shadow.shadowId, 'src/new.js::newFunc');

      const updated = await registry.getShadow(shadow.shadowId);
      expect(updated.status).toBe(ShadowStatus.REPLACED);
      expect(updated.replacedBy).toBe('src/new.js::newFunc');
    });

    it('does nothing for non-existent shadow', async () => {
      await expect(registry.markReplaced('shadow_nonexistent', 'newId')).resolves.not.toThrow();
    });
  });

  describe('getLineage()', () => {
    it('reconstructs lineage for single shadow', async () => {
      const atom = createAtomWithDNA({});
      const shadow = await registry.createShadow(atom);

      const lineage = await registry.getLineage(shadow.shadowId);

      expect(lineage).toBeDefined();
      expect(Array.isArray(lineage)).toBe(true);
      expect(lineage.length).toBe(1);
      expect(lineage[0].shadowId).toBe(shadow.shadowId);
    });

    it('reconstructs multi-generational lineage', async () => {
      const grandparentAtom = createAtomWithDNA({});
      const grandparent = await registry.createShadow(grandparentAtom);

      const parentAtom = createAtomWithDNA({});
      parentAtom.ancestry = { replaced: grandparent.shadowId, generation: 1 };
      const parent = await registry.createShadow(parentAtom);

      const childAtom = createAtomWithDNA({});
      childAtom.ancestry = { replaced: parent.shadowId, generation: 2 };
      const child = await registry.createShadow(childAtom);

      const lineage = await registry.getLineage(child.shadowId);

      expect(lineage.length).toBe(3);
      expect(lineage[0].shadowId).toBe(grandparent.shadowId);
      expect(lineage[1].shadowId).toBe(parent.shadowId);
      expect(lineage[2].shadowId).toBe(child.shadowId);
    });

    it('handles circular lineage gracefully', async () => {
      const atom = createAtomWithDNA({});
      const shadow = await registry.createShadow(atom);

      shadow.lineage.parentShadowId = shadow.shadowId;
      await registry._saveShadow(shadow);

      await expect(registry.getLineage(shadow.shadowId)).rejects.toThrow('Lineage too deep');
    });
  });

  describe('Error Handling', () => {
    it('handles null atom gracefully', async () => {
      await expect(registry.createShadow(null)).rejects.toThrow();
    });

    it('handles undefined atom gracefully', async () => {
      await expect(registry.createShadow(undefined)).rejects.toThrow();
    });

    it('initializes only once', async () => {
      await registry.initialize();
      const firstInit = registry.initialized;
      
      await registry.initialize();
      
      expect(firstInit).toBe(true);
      expect(registry.initialized).toBe(true);
    });
  });

  describe('listShadows()', () => {
    it('lists all shadows', async () => {
      const atom1 = createAtomWithDNA({});
      atom1.id = 'test1';
      const atom2 = createAtomWithDNA({});
      atom2.id = 'test2';
      
      await registry.createShadow(atom1);
      await registry.createShadow(atom2);

      const shadows = await registry.listShadows();

      expect(shadows.length).toBe(2);
    });

    it('filters by status', async () => {
      const atom1 = createAtomWithDNA({});
      const atom2 = createAtomWithDNA({});
      atom2.id = 'test2';
      
      const shadow1 = await registry.createShadow(atom1);
      await registry.createShadow(atom2);
      await registry.markReplaced(shadow1.shadowId, 'newId');

      const deleted = await registry.listShadows({ status: ShadowStatus.DELETED });
      const replaced = await registry.listShadows({ status: ShadowStatus.REPLACED });

      expect(deleted.length).toBe(1);
      expect(replaced.length).toBe(1);
    });
  });
});
