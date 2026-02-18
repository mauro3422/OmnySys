/**
 * @fileoverview atomic-cache.test.js
 * 
 * REAL tests for AtomicCache.
 * NO MOCKS - tests real cache operations with real data.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { AtomicCache } from '#shared/atomic-cache.js';
import { AtomBuilder } from '../../factories/shared/builders.js';

describe('AtomicCache - Basic Operations', () => {
  let cache;

  beforeEach(() => {
    cache = new AtomicCache();
  });

  afterEach(() => {
    cache.clear();
  });

  it('stores and retrieves an atom', () => {
    const atom = AtomBuilder.create().build();
    const atomId = atom.id;

    cache.setAtom(atomId, atom, atom.filePath);
    const retrieved = cache.getAtom(atomId);

    expect(retrieved).not.toBeNull();
    expect(retrieved.id).toBe(atomId);
    expect(retrieved.name).toBe(atom.name);
  });

  it('returns null for non-existent atom', () => {
    const result = cache.getAtom('non-existent::atom');
    expect(result).toBeNull();
  });

  it('updates lastAccessed on get', async () => {
    const atom = AtomBuilder.create().build();
    cache.setAtom(atom.id, atom, atom.filePath);

    await new Promise(r => setTimeout(r, 10));

    cache.getAtom(atom.id);
    const cachedItem = cache.atoms.get(atom.id);

    expect(cachedItem.lastAccessed).toBeGreaterThan(cachedItem.createdAt);
  });

  it('handles multiple atoms', () => {
    const atoms = [
      AtomBuilder.create('file1.js::func1').build(),
      AtomBuilder.create('file2.js::func2').build(),
      AtomBuilder.create('file3.js::func3').build()
    ];

    atoms.forEach(a => cache.setAtom(a.id, a, a.filePath));

    expect(cache.atoms.size).toBe(3);
    expect(cache.getAtom('file1.js::func1')).not.toBeNull();
    expect(cache.getAtom('file2.js::func2')).not.toBeNull();
    expect(cache.getAtom('file3.js::func3')).not.toBeNull();
  });
});

describe('AtomicCache - TTL Expiration', () => {
  let cache;

  beforeEach(() => {
    cache = new AtomicCache({ ttlMs: 50 });
  });

  afterEach(() => {
    cache.clear();
  });

  it('returns atom before TTL expires', async () => {
    const atom = AtomBuilder.create().build();
    cache.setAtom(atom.id, atom, atom.filePath);

    const retrieved = cache.getAtom(atom.id);
    expect(retrieved).not.toBeNull();
  });

  it('returns null after TTL expires', async () => {
    const atom = AtomBuilder.create().build();
    cache.setAtom(atom.id, atom, atom.filePath);

    await new Promise(r => setTimeout(r, 100));

    const retrieved = cache.getAtom(atom.id);
    expect(retrieved).toBeNull();
  });

  it('removes expired atom from cache', async () => {
    const atom = AtomBuilder.create().build();
    cache.setAtom(atom.id, atom, atom.filePath);

    await new Promise(r => setTimeout(r, 100));

    cache.getAtom(atom.id);
    expect(cache.atoms.has(atom.id)).toBe(false);
  });
});

describe('AtomicCache - Batch Operations', () => {
  let cache;

  beforeEach(() => {
    cache = new AtomicCache();
  });

  afterEach(() => {
    cache.clear();
  });

  it('getAtoms returns found and missing', () => {
    const atom1 = AtomBuilder.create('file1.js::func1').build();
    const atom2 = AtomBuilder.create('file2.js::func2').build();

    cache.setAtom(atom1.id, atom1, atom1.filePath);
    cache.setAtom(atom2.id, atom2, atom2.filePath);

    const { found, missing } = cache.getAtoms([
      'file1.js::func1',
      'file2.js::func2',
      'file3.js::func3'
    ]);

    expect(found.size).toBe(2);
    expect(missing).toContain('file3.js::func3');
  });

  it('getAtoms handles empty array', () => {
    const { found, missing } = cache.getAtoms([]);

    expect(found.size).toBe(0);
    expect(missing).toEqual([]);
  });

  it('getAtoms handles all missing', () => {
    const { found, missing } = cache.getAtoms(['a', 'b', 'c']);

    expect(found.size).toBe(0);
    expect(missing).toHaveLength(3);
  });
});

describe('AtomicCache - Invalidation', () => {
  let cache;

  beforeEach(() => {
    cache = new AtomicCache();
  });

  afterEach(() => {
    cache.clear();
  });

  it('invalidates single atom', () => {
    const atom = AtomBuilder.create().build();
    cache.setAtom(atom.id, atom, atom.filePath);

    cache.invalidateAtom(atom.id);

    expect(cache.getAtom(atom.id)).toBeNull();
  });

  it('invalidates file with multiple atoms', () => {
    const filePath = 'src/utils.js';
    const atom1 = AtomBuilder.create(`${filePath}::func1`).build();
    const atom2 = AtomBuilder.create(`${filePath}::func2`).build();
    const atom3 = AtomBuilder.create(`${filePath}::func3`).build();

    cache.setAtom(atom1.id, atom1, filePath);
    cache.setAtom(atom2.id, atom2, filePath);
    cache.setAtom(atom3.id, atom3, filePath);

    cache.invalidateFile(filePath);

    expect(cache.getAtom(atom1.id)).toBeNull();
    expect(cache.getAtom(atom2.id)).toBeNull();
    expect(cache.getAtom(atom3.id)).toBeNull();
    expect(cache.fileToAtoms.has(filePath)).toBe(false);
  });

  it('handles invalidating non-existent atom', () => {
    expect(() => cache.invalidateAtom('non-existent')).not.toThrow();
  });

  it('handles invalidating non-existent file', () => {
    expect(() => cache.invalidateFile('non-existent.js')).not.toThrow();
  });

  it('maintains file index correctly', () => {
    const file1 = 'src/a.js';
    const file2 = 'src/b.js';

    cache.setAtom(`${file1}::f1`, AtomBuilder.create(`${file1}::f1`).build(), file1);
    cache.setAtom(`${file1}::f2`, AtomBuilder.create(`${file1}::f2`).build(), file1);
    cache.setAtom(`${file2}::g1`, AtomBuilder.create(`${file2}::g1`).build(), file2);

    expect(cache.fileToAtoms.size).toBe(2);
    expect(cache.fileToAtoms.get(file1).size).toBe(2);
    expect(cache.fileToAtoms.get(file2).size).toBe(1);

    cache.invalidateFile(file1);

    expect(cache.fileToAtoms.size).toBe(1);
    expect(cache.fileToAtoms.has(file1)).toBe(false);
    expect(cache.fileToAtoms.has(file2)).toBe(true);
  });
});

describe('AtomicCache - LRU Eviction', () => {
  let cache;

  beforeEach(() => {
    cache = new AtomicCache({ maxAtoms: 3 });
  });

  afterEach(() => {
    cache.clear();
  });

  it('evicts oldest atom when limit reached', () => {
    const atom1 = AtomBuilder.create('file1.js::func1').build();
    const atom2 = AtomBuilder.create('file2.js::func2').build();
    const atom3 = AtomBuilder.create('file3.js::func3').build();
    const atom4 = AtomBuilder.create('file4.js::func4').build();

    cache.setAtom(atom1.id, atom1, atom1.filePath);
    cache.setAtom(atom2.id, atom2, atom2.filePath);
    cache.setAtom(atom3.id, atom3, atom3.filePath);
    cache.setAtom(atom4.id, atom4, atom4.filePath);

    expect(cache.atoms.size).toBe(3);
    expect(cache.getAtom(atom1.id)).toBeNull();
    expect(cache.getAtom(atom4.id)).not.toBeNull();
  });

  it('evicts least recently used', async () => {
    const atom1 = AtomBuilder.create('file1.js::func1').build();
    const atom2 = AtomBuilder.create('file2.js::func2').build();
    const atom3 = AtomBuilder.create('file3.js::func3').build();

    cache.setAtom(atom1.id, atom1, atom1.filePath);
    cache.setAtom(atom2.id, atom2, atom2.filePath);
    cache.setAtom(atom3.id, atom3, atom3.filePath);

    await new Promise(r => setTimeout(r, 5));
    cache.getAtom(atom1.id);

    const atom4 = AtomBuilder.create('file4.js::func4').build();
    cache.setAtom(atom4.id, atom4, atom4.filePath);

    expect(cache.getAtom(atom1.id)).not.toBeNull();
    expect(cache.getAtom(atom2.id)).toBeNull();
  });
});

describe('AtomicCache - Statistics', () => {
  let cache;

  beforeEach(() => {
    cache = new AtomicCache();
  });

  afterEach(() => {
    cache.clear();
  });

  it('returns correct stats', () => {
    const atom = AtomBuilder.create().build();
    cache.setAtom(atom.id, atom, atom.filePath);

    const stats = cache.getStats();

    expect(stats.atomsCached).toBe(1);
    expect(stats.filesTracked).toBe(1);
    expect(stats.memoryUsageKB).toBeGreaterThanOrEqual(0);
  });

  it('tracks derivation stats', () => {
    const stats = cache.getStats();
    expect(stats.derivationStats).toBeDefined();
  });

  it('updates stats after operations', () => {
    const atom1 = AtomBuilder.create('file1.js::func1').build();
    const atom2 = AtomBuilder.create('file2.js::func2').build();

    cache.setAtom(atom1.id, atom1, atom1.filePath);
    cache.setAtom(atom2.id, atom2, atom2.filePath);

    let stats = cache.getStats();
    expect(stats.atomsCached).toBe(2);

    cache.invalidateAtom(atom1.id);

    stats = cache.getStats();
    expect(stats.atomsCached).toBe(1);
  });
});

describe('AtomicCache - Derivation Integration', () => {
  let cache;

  beforeEach(() => {
    cache = new AtomicCache();
  });

  afterEach(() => {
    cache.clear();
  });

  it('derives molecular metadata from atoms', () => {
    const atoms = [
      AtomBuilder.create('file.js::func1').asExported().build(),
      AtomBuilder.create('file.js::func2').asExported().build()
    ];

    atoms.forEach(a => cache.setAtom(a.id, a, 'file.js'));

    const result = cache.derive('file.js', atoms, 'moleculeExportCount');

    expect(result).toBe(2);
  });

  it('caches derivation results', () => {
    const atoms = [
      AtomBuilder.create('file.js::func1').build()
    ];

    cache.derive('file.js', atoms, 'moleculeExportCount');
    cache.derive('file.js', atoms, 'moleculeExportCount');

    const stats = cache.derivations.getStats();
    expect(stats.hits).toBe(1);
  });

  it('invalidates derivations when atom changes', () => {
    const atom = AtomBuilder.create('file.js::func1').build();
    const atoms = [atom];

    cache.derive('file.js', atoms, 'moleculeExportCount');

    cache.invalidateAtom(atom.id);

    expect(cache.derivations.cache.size).toBe(0);
  });
});

describe('AtomicCache - Real File Scenarios', () => {
  let cache;
  let tempDir;

  beforeEach(async () => {
    cache = new AtomicCache();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
  });

  afterEach(async () => {
    cache.clear();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('caches atoms from real file structure', async () => {
    const jsFile = `
export function processA() { return 1; }
export function processB() { return 2; }
export function processC() { return 3; }
    `;

    const filePath = path.join(tempDir, 'utils.js');
    await fs.writeFile(filePath, jsFile);

    const atoms = [
      AtomBuilder.create(`${filePath}::processA`).build(),
      AtomBuilder.create(`${filePath}::processB`).build(),
      AtomBuilder.create(`${filePath}::processC`).build()
    ];

    atoms.forEach(a => cache.setAtom(a.id, a, filePath));

    const { found } = cache.getAtoms(atoms.map(a => a.id));
    expect(found.size).toBe(3);
  });

  it('invalidates cache when file is modified', async () => {
    const filePath = path.join(tempDir, 'module.js');
    await fs.writeFile(filePath, 'export function old() {}');

    const atom = AtomBuilder.create(`${filePath}::old`).build();
    cache.setAtom(atom.id, atom, filePath);

    await fs.writeFile(filePath, 'export function newFunc() {}');

    cache.invalidateFile(filePath);

    expect(cache.getAtom(atom.id)).toBeNull();
  });
});

describe('AtomicCache - Clear Operation', () => {
  let cache;

  beforeEach(() => {
    cache = new AtomicCache();
  });

  it('clears all data', () => {
    const atom = AtomBuilder.create().build();
    cache.setAtom(atom.id, atom, atom.filePath);

    cache.clear();

    expect(cache.atoms.size).toBe(0);
    expect(cache.derivations.cache.size).toBe(0);
    expect(cache.fileToAtoms.size).toBe(0);
  });

  it('allows reuse after clear', () => {
    const atom1 = AtomBuilder.create('file1.js::func1').build();
    cache.setAtom(atom1.id, atom1, atom1.filePath);
    cache.clear();

    const atom2 = AtomBuilder.create('file2.js::func2').build();
    cache.setAtom(atom2.id, atom2, atom2.filePath);

    expect(cache.getAtom(atom2.id)).not.toBeNull();
  });
});
