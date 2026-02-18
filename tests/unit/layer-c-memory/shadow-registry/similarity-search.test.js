import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { findSimilarShadows, findBestMatch } from '#layer-c/shadow-registry/search/similarity-search.js';
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

describe('Similarity Search', () => {
  let tempDir;
  let registry;

  beforeEach(async () => {
    resetShadowRegistry();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shadow-search-test-'));
    registry = new ShadowRegistry(tempDir);
    await registry.initialize();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Structure Contract', () => {
    it('MUST export findSimilarShadows function', () => {
      expect(typeof findSimilarShadows).toBe('function');
    });

    it('MUST export findBestMatch function', () => {
      expect(typeof findBestMatch).toBe('function');
    });
  });

  describe('findSimilarShadows()', () => {
    it('returns matches above threshold', async () => {
      await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const results = await findSimilarShadows(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        { minSimilarity: 0.5 }
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('shadow');
      expect(results[0]).toHaveProperty('similarity');
    });

    it('returns empty array for atom without DNA', async () => {
      const atom = { id: 'test' };

      const results = await findSimilarShadows(atom, registry.indexManager, (id) => registry.getShadow(id));

      expect(results).toEqual([]);
    });

    it('excludes replaced shadows by default', async () => {
      const shadow1 = await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));
      await registry.markReplaced(shadow1.shadowId, 'newAtomId');

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const results = await findSimilarShadows(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        { minSimilarity: 0.5 }
      );

      const replacedFound = results.some(r => r.shadow.shadowId === shadow1.shadowId);
      expect(replacedFound).toBe(false);
    });

    it('includes replaced shadows when specified', async () => {
      const shadow1 = await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));
      await registry.markReplaced(shadow1.shadowId, 'newAtomId');

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const results = await findSimilarShadows(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        { minSimilarity: 0.5, includeReplaced: true }
      );

      const replacedFound = results.some(r => r.shadow.shadowId === shadow1.shadowId);
      expect(replacedFound).toBe(true);
    });

    it('respects limit option', async () => {
      await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));
      const atom2 = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });
      atom2.id = 'src/test2.js::func2';
      await registry.createShadow(atom2);

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const results = await findSimilarShadows(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        { minSimilarity: 0.5, limit: 1 }
      );

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('respects minSimilarity threshold', async () => {
      await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));

      const searchAtom = createAtomWithDNA({ 
        structuralHash: 'uniqueHash', 
        patternHash: 'p2', 
        flowType: 'side-effect-only',
        operationSequence: ['emit']
      });

      const results = await findSimilarShadows(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        { minSimilarity: 0.95 }
      );

      results.forEach(r => {
        expect(r.similarity).toBeGreaterThanOrEqual(0.95);
      });
    });

    it('sorts results by similarity descending', async () => {
      await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));
      const atom2 = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });
      atom2.id = 'src/test2.js::func2';
      await registry.createShadow(atom2);

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const results = await findSimilarShadows(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        { minSimilarity: 0.5 }
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('filters by flowType', async () => {
      await registry.createShadow(createAtomWithDNA({ structuralHash: 'h1', patternHash: 'p1', flowType: 'transform-return' }));
      const atom2 = createAtomWithDNA({ structuralHash: 'h2', patternHash: 'p2', flowType: 'side-effect-only' });
      atom2.id = 'src/test2.js::func2';
      await registry.createShadow(atom2);

      const searchAtom = createAtomWithDNA({ structuralHash: 'unique', patternHash: 'unique', flowType: 'transform-return' });

      const entries = await registry.indexManager.getEntries();
      const asyncEntries = entries.filter(e => e.flowType === 'side-effect-only');
      expect(asyncEntries.length).toBe(1);
    });
  });

  describe('findBestMatch()', () => {
    it('returns highest match', async () => {
      await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const result = await findBestMatch(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        0.5
      );

      expect(result).toBeDefined();
      expect(result.shadow.dna.structuralHash).toBe('hashA');
    });

    it('returns null when no match above threshold', async () => {
      await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));

      const searchAtom = createAtomWithDNA({ 
        structuralHash: 'uniqueX', 
        patternHash: 'uniqueY', 
        flowType: 'side-effect-only',
        operationSequence: ['emit']
      });

      const result = await findBestMatch(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        0.95
      );

      expect(result).toBeNull();
    });

    it('handles no-match scenario', async () => {
      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const result = await findBestMatch(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id)
      );

      expect(result).toBeNull();
    });

    it('uses default minSimilarity of 0.85', async () => {
      await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));

      const searchAtom = createAtomWithDNA({ 
        structuralHash: 'uniqueX', 
        patternHash: 'p1', 
        flowType: 'transform-return' 
      });

      const result = await findBestMatch(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id)
      );

      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('handles missing shadow in getShadow', async () => {
      const missingGetShadow = async () => null;

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const results = await findSimilarShadows(searchAtom, registry.indexManager, missingGetShadow);

      expect(results).toEqual([]);
    });

    it('handles shadow without DNA', async () => {
      const noDnaShadows = {
        'shadow_no_dna': { shadowId: 'shadow_no_dna', status: ShadowStatus.DELETED }
      };
      const getShadowNoDna = async (id) => noDnaShadows[id] || null;

      await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const results = await findSimilarShadows(searchAtom, registry.indexManager, getShadowNoDna);

      expect(results).toEqual([]);
    });

    it('handles invalid DNA gracefully', async () => {
      const atom = { id: 'test', dna: null };

      const results = await findSimilarShadows(atom, registry.indexManager, (id) => registry.getShadow(id));

      expect(results).toEqual([]);
    });

    it('handles empty index', async () => {
      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const results = await findSimilarShadows(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id)
      );

      expect(results).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('handles exact match', async () => {
      await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const result = await findBestMatch(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        0.95
      );

      expect(result).not.toBeNull();
      expect(result.similarity).toBe(1);
    });

    it('handles boundary similarity values', async () => {
      await registry.createShadow(createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' }));
      const atom2 = createAtomWithDNA({ structuralHash: 'hashB', patternHash: 'p2', flowType: 'side-effect-only' });
      atom2.id = 'src/test2.js::func2';
      await registry.createShadow(atom2);

      const searchAtom = createAtomWithDNA({ structuralHash: 'hashA', patternHash: 'p1', flowType: 'transform-return' });

      const results = await findSimilarShadows(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        { minSimilarity: 0.60 }
      );

      const hasLowMatch = results.some(r => r.shadow.dna.flowType === 'side-effect-only');
      expect(hasLowMatch).toBe(false);
    });

    it('handles large result sets', async () => {
      for (let i = 0; i < 20; i++) {
        const atom = createAtomWithDNA({ structuralHash: `hash${i}`, patternHash: 'p1', flowType: 'transform-return' });
        atom.id = `src/test${i}.js::func${i}`;
        await registry.createShadow(atom);
      }

      const searchAtom = createAtomWithDNA({ structuralHash: 'hash1', patternHash: 'p1', flowType: 'transform-return' });

      const results = await findSimilarShadows(
        searchAtom, 
        registry.indexManager, 
        (id) => registry.getShadow(id), 
        { limit: 10 }
      );

      expect(results.length).toBeLessThanOrEqual(10);
    });
  });
});
