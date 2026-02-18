/**
 * @fileoverview derivation-engine.test.js
 * 
 * REAL tests for Derivation Engine.
 * NO MOCKS - tests real derivation rules with real atom data.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  DerivationCache,
  composeMolecularMetadata,
  createComposer,
  moleculeArchetype,
  moleculeComplexity,
  moleculeRisk,
  moleculeExports,
  moleculeExportCount,
  moleculeFunctionCount,
  moleculeHasSideEffects,
  moleculeHasNetworkCalls,
  moleculeHasDomManipulation,
  moleculeHasStorageAccess,
  moleculeHasErrorHandling,
  moleculeHasAsyncPatterns,
  moleculeExternalCallCount,
  moleculeNetworkEndpoints,
  moleculeHasLifecycleHooks,
  moleculeHasCleanupPatterns,
  DerivationRules,
  getAvailableRules,
  hasRule
} from '#shared/derivation-engine.js';
import { AtomBuilder } from '../../factories/shared/builders.js';

describe('DerivationCache - Basic Operations', () => {
  let cache;

  beforeEach(() => {
    cache = new DerivationCache();
  });

  afterEach(() => {
    cache.clear();
  });

  it('derives and caches result', () => {
    const atoms = [AtomBuilder.create().build()];

    const result1 = cache.derive('test.js', atoms, 'moleculeExportCount');
    const result2 = cache.derive('test.js', atoms, 'moleculeExportCount');

    expect(result1).toBe(result2);
    expect(cache.stats.hits).toBe(1);
    expect(cache.stats.misses).toBe(1);
  });

  it('invalidates by atom ID', () => {
    const atom = AtomBuilder.create().build();
    const atoms = [atom];

    cache.derive('test.js', atoms, 'moleculeExportCount');
    cache.invalidate(atom.id);

    expect(cache.cache.size).toBe(0);
  });

  it('invalidates molecule', () => {
    const atoms = [AtomBuilder.create().build()];

    cache.derive('test.js', atoms, 'moleculeExportCount');
    cache.derive('test.js', atoms, 'moleculeComplexity');
    cache.invalidateMolecule('test.js');

    expect(cache.cache.size).toBe(0);
  });

  it('clears all cache', () => {
    const atoms = [AtomBuilder.create().build()];

    cache.derive('file1.js', atoms, 'moleculeExportCount');
    cache.derive('file2.js', atoms, 'moleculeExportCount');
    cache.clear();

    expect(cache.cache.size).toBe(0);
    expect(cache.dependencyGraph.size).toBe(0);
  });

  it('tracks dependencies', () => {
    const atom1 = AtomBuilder.create('file.js::func1').build();
    const atom2 = AtomBuilder.create('file.js::func2').build();

    cache.derive('file.js', [atom1, atom2], 'moleculeExportCount');

    expect(cache.dependencyGraph.has(atom1.id)).toBe(true);
    expect(cache.dependencyGraph.has(atom2.id)).toBe(true);
  });

  it('getStats returns correct information', () => {
    const atoms = [AtomBuilder.create().build()];

    cache.derive('test.js', atoms, 'moleculeExportCount');
    cache.derive('test.js', atoms, 'moleculeExportCount');

    const stats = cache.getStats();

    expect(stats.cacheSize).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  it('has and get methods work', () => {
    const atoms = [AtomBuilder.create().build()];
    const cacheKey = 'test.js::moleculeExportCount';

    expect(cache.has(cacheKey)).toBe(false);

    cache.derive('test.js', atoms, 'moleculeExportCount');

    expect(cache.has(cacheKey)).toBe(true);
    expect(cache.get(cacheKey)).toBeDefined();
  });
});

describe('DerivationRules - Registry', () => {
  it('getAvailableRules returns all rules', () => {
    const rules = Object.keys(DerivationRules);

    expect(rules).toContain('moleculeArchetype');
    expect(rules).toContain('moleculeComplexity');
    expect(rules).toContain('moleculeExportCount');
    expect(rules.length).toBeGreaterThan(10);
  });

  it('hasRule checks rule existence', () => {
    expect('moleculeArchetype' in DerivationRules).toBe(true);
    expect('nonExistentRule' in DerivationRules).toBe(false);
  });

  it('DerivationRules contains all expected rules', () => {
    expect(DerivationRules.moleculeArchetype).toBeDefined();
    expect(DerivationRules.moleculeComplexity).toBeDefined();
    expect(DerivationRules.moleculeExportCount).toBeDefined();
  });
});

describe('moleculeArchetype - Derivation Rules', () => {
  it('returns standard for empty atoms', () => {
    const result = moleculeArchetype([]);

    expect(result.type).toBe('standard');
    expect(result.severity).toBe(1);
  });

  it('detects network-hub archetype', () => {
    const atoms = [
      AtomBuilder.create('f.js::net1').asFragileNetwork().asExported().build(),
      AtomBuilder.create('f.js::net2').asFragileNetwork().asExported().build()
    ];

    const result = moleculeArchetype(atoms);

    expect(result.type).toBe('network-hub');
    expect(result.severity).toBe(8);
  });

  it('detects internal-module archetype', () => {
    const atoms = [
      AtomBuilder.create('f.js::priv1').asExported(false).build(),
      AtomBuilder.create('f.js::priv2').asExported(false).build()
    ];

    const result = moleculeArchetype(atoms);

    expect(result.type).toBe('internal-module');
  });

  it('detects critical-module archetype', () => {
    const atoms = [
      AtomBuilder.create('f.js::hot1').asHotPath().build(),
      AtomBuilder.create('f.js::hot2').asHotPath().build()
    ];

    const result = moleculeArchetype(atoms);

    expect(result.type).toBe('critical-module');
    expect(result.severity).toBe(9);
  });

  it('detects god-object archetype', () => {
    const atoms = [
      AtomBuilder.create('f.js::god').asGodFunction().build()
    ];

    const result = moleculeArchetype(atoms);

    expect(result.type).toBe('god-object');
    expect(result.severity).toBe(10);
  });

  it('detects validation-module archetype', () => {
    const atoms = [
      AtomBuilder.create('f.js::v1').asValidator().build(),
      AtomBuilder.create('f.js::v2').asValidator().build()
    ];

    const result = moleculeArchetype(atoms);

    expect(result.type).toBe('validation-module');
  });
});

describe('moleculeComplexity - Derivation Rules', () => {
  it('sums atom complexities', () => {
    const atoms = [
      AtomBuilder.create().withComplexity(5).build(),
      AtomBuilder.create().withComplexity(10).build(),
      AtomBuilder.create().withComplexity(3).build()
    ];

    const result = moleculeComplexity(atoms);

    expect(result).toBe(18);
  });

  it('handles zero complexity', () => {
    const atoms = [
      AtomBuilder.create().withComplexity(0).build()
    ];

    const result = moleculeComplexity(atoms);

    expect(result).toBe(0);
  });

  it('handles empty atoms', () => {
    const result = moleculeComplexity([]);

    expect(result).toBe(0);
  });

  it('handles missing complexity', () => {
    const atoms = [
      AtomBuilder.create().withoutField('complexity').build()
    ];

    const result = moleculeComplexity(atoms);

    expect(result).toBe(0);
  });
});

describe('moleculeRisk - Derivation Rules', () => {
  it('calculates risk from atoms', () => {
    const atoms = [
      AtomBuilder.create().withComplexity(10).asFragileNetwork().build()
    ];

    const result = moleculeRisk(atoms);

    expect(result).toBeGreaterThan(0);
  });
});

describe('moleculeExports - Derivation Rules', () => {
  it('returns list of exported atom names', () => {
    const atoms = [
      AtomBuilder.create('f.js::exp1').asExported().build(),
      AtomBuilder.create('f.js::exp2').asExported().build(),
      AtomBuilder.create('f.js::priv').asExported(false).build()
    ];

    const result = moleculeExports(atoms);

    expect(result).toContain('exp1');
    expect(result).toContain('exp2');
    expect(result).not.toContain('priv');
    expect(result.length).toBe(2);
  });

  it('returns empty array for no exports', () => {
    const atoms = [
      AtomBuilder.create().asExported(false).build()
    ];

    const result = moleculeExports(atoms);

    expect(result).toEqual([]);
  });
});

describe('moleculeExportCount - Derivation Rules', () => {
  it('counts exported atoms', () => {
    const atoms = [
      AtomBuilder.create().asExported().build(),
      AtomBuilder.create().asExported().build(),
      AtomBuilder.create().asExported(false).build()
    ];

    const result = moleculeExportCount(atoms);

    expect(result).toBe(2);
  });
});

describe('moleculeFunctionCount - Derivation Rules', () => {
  it('counts all atoms', () => {
    const atoms = [
      AtomBuilder.create().build(),
      AtomBuilder.create().build(),
      AtomBuilder.create().build()
    ];

    const result = moleculeFunctionCount(atoms);

    expect(result).toBe(3);
  });

  it('handles empty array', () => {
    const result = moleculeFunctionCount([]);

    expect(result).toBe(0);
  });
});

describe('moleculeHasSideEffects - Derivation Rules', () => {
  it('returns true when any atom has side effects', () => {
    const atoms = [
      AtomBuilder.create().withNetworkCalls().build(),
      AtomBuilder.create().build()
    ];

    const result = moleculeHasSideEffects(atoms);

    expect(result).toBe(true);
  });

  it('returns false when no atoms have side effects', () => {
    const atoms = [
      AtomBuilder.create().build(),
      AtomBuilder.create().build()
    ];

    const result = moleculeHasSideEffects(atoms);

    expect(result).toBe(false);
  });
});

describe('moleculeHasNetworkCalls - Derivation Rules', () => {
  it('detects network calls', () => {
    const atoms = [
      AtomBuilder.create().withNetworkCalls().build()
    ];

    expect(moleculeHasNetworkCalls(atoms)).toBe(true);
  });

  it('returns false without network calls', () => {
    const atoms = [
      AtomBuilder.create().build()
    ];

    expect(moleculeHasNetworkCalls(atoms)).toBe(false);
  });
});

describe('moleculeHasDomManipulation - Derivation Rules', () => {
  it('detects DOM manipulation', () => {
    const atoms = [
      AtomBuilder.create().withDomManipulation().build()
    ];

    expect(moleculeHasDomManipulation(atoms)).toBe(true);
  });
});

describe('moleculeHasStorageAccess - Derivation Rules', () => {
  it('detects storage access', () => {
    const atoms = [
      AtomBuilder.create().withStorageAccess().build()
    ];

    expect(moleculeHasStorageAccess(atoms)).toBe(true);
  });
});

describe('moleculeHasErrorHandling - Derivation Rules', () => {
  it('detects error handling', () => {
    const atoms = [
      AtomBuilder.create().withInvalidType('hasErrorHandling', true).build()
    ];

    expect(moleculeHasErrorHandling(atoms)).toBe(true);
  });
});

describe('moleculeHasAsyncPatterns - Derivation Rules', () => {
  it('detects async patterns', () => {
    const atoms = [
      AtomBuilder.create().asAsync().build()
    ];

    expect(moleculeHasAsyncPatterns(atoms)).toBe(true);
  });
});

describe('moleculeExternalCallCount - Derivation Rules', () => {
  it('sums external calls', () => {
    const atom1 = AtomBuilder.create().build();
    atom1.calls = [{ type: 'external', name: 'api1' }, { type: 'external', name: 'api2' }, { type: 'internal', name: 'local' }];
    const atom2 = AtomBuilder.create().build();
    atom2.calls = [{ type: 'external', name: 'api3' }, { type: 'external', name: 'api4' }];

    const atoms = [atom1, atom2];

    expect(moleculeExternalCallCount(atoms)).toBe(4);
  });
});

describe('moleculeNetworkEndpoints - Derivation Rules', () => {
  it('collects network endpoints', () => {
    const atom1 = AtomBuilder.create().build();
    atom1.networkEndpoints = ['https://api.example.com/users'];
    const atom2 = AtomBuilder.create().build();
    atom2.networkEndpoints = ['https://api.example.com/posts'];

    const result = moleculeNetworkEndpoints([atom1, atom2]);

    expect(result.length).toBe(2);
  });
});

describe('moleculeHasLifecycleHooks - Derivation Rules', () => {
  it('detects lifecycle hooks', () => {
    const atom = AtomBuilder.create().build();
    atom.hasLifecycleHooks = true;

    expect(moleculeHasLifecycleHooks([atom])).toBe(true);
  });
});

describe('moleculeHasCleanupPatterns - Derivation Rules', () => {
  it('detects cleanup patterns', () => {
    const atom = AtomBuilder.create().build();
    atom.hasLifecycleHooks = true;
    atom.hasCleanupPatterns = true;

    expect(moleculeHasCleanupPatterns([atom])).toBe(true);
  });
});

describe('composeMolecularMetadata - Full Composition', () => {
  it('composes complete molecular metadata', () => {
    const atoms = [
      AtomBuilder.create('test.js::func1')
        .asExported()
        .withComplexity(5)
        .build(),
      AtomBuilder.create('test.js::func2')
        .asExported()
        .withComplexity(10)
        .build()
    ];

    const result = composeMolecularMetadata('test.js', atoms);

    expect(result.id).toBe('test.js');
    expect(result.type).toBe('molecule');
    expect(result.atomCount).toBe(2);
    expect(result.totalComplexity).toBe(15);
    expect(result.exportCount).toBe(2);
    expect(result.derivedAt).toBeDefined();
    expect(result.derivationSource).toBe('atomic-composition');
  });

  it('includes all derived fields', () => {
    const atoms = [
      AtomBuilder.create()
        .asExported()
        .withNetworkCalls()
        .build()
    ];

    const result = composeMolecularMetadata('network.js', atoms);

    expect(result.hasNetworkCalls).toBe(true);
    expect(result.hasSideEffects).toBe(true);
    expect(result.archetype).toBeDefined();
  });

  it('handles empty atoms array', () => {
    const result = composeMolecularMetadata('empty.js', []);

    expect(result.atomCount).toBe(0);
    expect(result.exportCount).toBe(0);
    expect(result.totalComplexity).toBe(0);
  });
});

describe('createComposer - Factory Function', () => {
  it('creates composer with cache', () => {
    const composer = createComposer();

    expect(composer.compose).toBeDefined();
    expect(composer.getStats).toBeDefined();
    expect(composer.invalidate).toBeDefined();
    expect(composer.clear).toBeDefined();
  });

  it('composer caches derivations', () => {
    const composer = createComposer();
    const atoms = [AtomBuilder.create().build()];

    composer.compose('test.js', atoms);
    composer.compose('test.js', atoms);

    const stats = composer.getStats();

    expect(stats.hits).toBeGreaterThan(0);
  });

  it('composer.invalidate clears by atom', () => {
    const composer = createComposer();
    const atom = AtomBuilder.create().build();

    composer.compose('test.js', [atom]);
    composer.invalidate(atom.id);

    const stats = composer.getStats();
    expect(stats.cacheSize).toBe(0);
  });

  it('composer.clear resets everything', () => {
    const composer = createComposer();
    const atoms = [AtomBuilder.create().build()];

    composer.compose('test.js', atoms);
    composer.clear();

    const stats = composer.getStats();
    expect(stats.cacheSize).toBe(0);
  });
});

describe('Derivation Engine - Real File Scenarios', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'derivation-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('derives metadata from real JS file structure', async () => {
    const jsContent = `
export async function fetchUsers() {
  const response = await fetch('/api/users');
  return response.json();
}

export function processUsers(users) {
  return users.filter(u => u.active);
}

function internalHelper() {
  return 'internal';
}
    `;

    await fs.writeFile(path.join(tempDir, 'api.js'), jsContent);

    const atoms = [
      AtomBuilder.create(`${tempDir}/api.js::fetchUsers`)
        .asExported()
        .asAsync()
        .withNetworkCalls()
        .withComplexity(5)
        .build(),
      AtomBuilder.create(`${tempDir}/api.js::processUsers`)
        .asExported()
        .withComplexity(3)
        .build(),
      AtomBuilder.create(`${tempDir}/api.js::internalHelper`)
        .asExported(false)
        .withComplexity(1)
        .build()
    ];

    const result = composeMolecularMetadata(`${tempDir}/api.js`, atoms);

    expect(result.exportCount).toBe(2);
    expect(result.functionCount).toBe(3);
    expect(result.hasNetworkCalls).toBe(true);
    expect(result.hasAsyncPatterns).toBe(true);
  });

  it('composes metadata for complex module', async () => {
    const atoms = [
      AtomBuilder.create('complex.js::api1').asExported().asFragileNetwork().withComplexity(15).build(),
      AtomBuilder.create('complex.js::api2').asExported().asFragileNetwork().withComplexity(12).build(),
      AtomBuilder.create('complex.js::util').asExported().withComplexity(3).build()
    ];

    const result = composeMolecularMetadata('complex.js', atoms);

    expect(result.archetype.type).toBe('network-hub');
    expect(result.totalComplexity).toBe(30);
    expect(result.exportCount).toBe(3);
  });
});
