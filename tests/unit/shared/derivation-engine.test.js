/**
 * @fileoverview derivation-engine.test.js
 *
 * REAL tests for Derivation Engine.
 * NO MOCKS - tests real derivation rules with real atom data.
 *
 * @module tests/unit/shared/derivation-engine.test.js
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
} from '#shared/derivation-engine/index.js';
import { AtomBuilder } from '../../factories/shared/builders.js';

/**
 * Base Builder for test data creation.
 * Provides fluent interface for creating test scenarios with common patterns.
 * Reduces duplication by centralizing atom creation logic.
 */
class TestScenarioBuilder {
  constructor() {
    this._atoms = [];
    this._filePath = 'test.js';
  }

  static create() {
    return new TestScenarioBuilder();
  }

  withFilePath(filePath) {
    this._filePath = filePath;
    return this;
  }

  addAtom(builderFn) {
    const builder = AtomBuilder.create(`${this._filePath}::func${this._atoms.length}`);
    builderFn(builder);
    this._atoms.push(builder.build());
    return this;
  }

  addExportedAtom(name, modifiers = []) {
    const builder = AtomBuilder.create(`${this._filePath}::${name}`);
    builder.asExported();
    modifiers.forEach(fn => fn(builder));
    this._atoms.push(builder.build());
    return this;
  }

  addPrivateAtom(name, modifiers = []) {
    const builder = AtomBuilder.create(`${this._filePath}::${name}`);
    builder.asExported(false);
    modifiers.forEach(fn => fn(builder));
    this._atoms.push(builder.build());
    return this;
  }

  build() {
    return { atoms: this._atoms, filePath: this._filePath };
  }

  buildAtoms() {
    return this._atoms;
  }
}

/**
 * Atom Factory - Pre-configured atom builders for common test patterns.
 * Follows SOLID Single Responsibility Principle.
 */
const AtomFactory = {
  exported: (name = 'func') => AtomBuilder.create(`f.js::${name}`).asExported(),
  private: (name = 'func') => AtomBuilder.create(`f.js::${name}`).asExported(false),
  network: (name = 'net') => AtomBuilder.create(`f.js::${name}`).asFragileNetwork().asExported(),
  hotPath: (name = 'hot') => AtomBuilder.create(`f.js::${name}`).asHotPath(),
  validator: (name = 'val') => AtomBuilder.create(`f.js::${name}`).asValidator(),
  godFunction: (name = 'god') => AtomBuilder.create(`f.js::${name}`).asGodFunction(),
  withComplexity: (value) => (builder) => builder.withComplexity(value),
  withNetwork: (builder) => builder.withNetworkCalls(),
  withDom: (builder) => builder.withDomManipulation(),
  withStorage: (builder) => builder.withStorageAccess(),
  async: (builder) => builder.asAsync(),
};

/**
 * Cache Test Helper - Centralizes cache operation logic.
 */
const CacheTestHelper = {
  deriveTwice: (cache, atoms, rule) => {
    cache.derive('test.js', atoms, rule);
    cache.derive('test.js', atoms, rule);
    return cache.getStats();
  },

  deriveMultiple: (cache, atoms, rules) => {
    rules.forEach(rule => cache.derive('test.js', atoms, rule));
    return cache;
  },
};

describe('DerivationCache - Basic Operations', () => {
  let cache;

  beforeEach(() => {
    cache = new DerivationCache();
  });

  afterEach(() => {
    cache.clear();
  });

  it('derives and caches result', () => {
    const { atoms } = TestScenarioBuilder.create().build();

    const result1 = cache.derive('test.js', atoms, 'moleculeExportCount');
    const result2 = cache.derive('test.js', atoms, 'moleculeExportCount');

    expect(result1).toBe(result2);
    expect(cache.stats.hits).toBe(1);
    expect(cache.stats.misses).toBe(1);
  });

  it('invalidates by atom ID', () => {
    const atom = AtomBuilder.create('test.js::func1').build();

    cache.derive('test.js', [atom], 'moleculeExportCount');
    cache.invalidate(atom.id);

    expect(cache.cache.size).toBe(0);
  });

  it('invalidates molecule', () => {
    const { atoms } = TestScenarioBuilder.create().build();

    CacheTestHelper.deriveMultiple(cache, atoms, ['moleculeExportCount', 'moleculeComplexity']);
    cache.invalidateMolecule('test.js');

    expect(cache.cache.size).toBe(0);
  });

  it('clears all cache', () => {
    const scenario1 = TestScenarioBuilder.create().withFilePath('file1.js').build();
    const scenario2 = TestScenarioBuilder.create().withFilePath('file2.js').build();

    cache.derive(scenario1.filePath, scenario1.atoms, 'moleculeExportCount');
    cache.derive(scenario2.filePath, scenario2.atoms, 'moleculeExportCount');
    cache.clear();

    expect(cache.cache.size).toBe(0);
    expect(cache.dependencyGraph.size).toBe(0);
  });

  it('tracks dependencies', () => {
    const { atoms } = TestScenarioBuilder.create()
      .addAtom(b => b.withId('file.js::func1'))
      .addAtom(b => b.withId('file.js::func2'))
      .build();

    cache.derive('file.js', atoms, 'moleculeExportCount');

    expect(cache.dependencyGraph.has(atoms[0].id)).toBe(true);
    expect(cache.dependencyGraph.has(atoms[1].id)).toBe(true);
  });

  it('getStats returns correct information', () => {
    const { atoms } = TestScenarioBuilder.create().build();
    const stats = CacheTestHelper.deriveTwice(cache, atoms, 'moleculeExportCount');

    expect(stats.cacheSize).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  it('has and get methods work', () => {
    const { atoms } = TestScenarioBuilder.create().build();
    const cacheKey = 'test.js::moleculeExportCount';

    expect(cache.has(cacheKey)).toBe(false);

    cache.derive('test.js', atoms, 'moleculeExportCount');

    expect(cache.has(cacheKey)).toBe(true);
    expect(cache.get(cacheKey)).toBeDefined();
  });
});

describe('DerivationRules - Registry', () => {
  const EXPECTED_RULES = ['moleculeArchetype', 'moleculeComplexity', 'moleculeExportCount'];

  it('getAvailableRules returns all rules', () => {
    const rules = Object.keys(DerivationRules);

    EXPECTED_RULES.forEach(rule => expect(rules).toContain(rule));
    expect(rules.length).toBeGreaterThan(10);
  });

  it('hasRule checks rule existence', () => {
    expect('moleculeArchetype' in DerivationRules).toBe(true);
    expect('nonExistentRule' in DerivationRules).toBe(false);
  });

  it('DerivationRules contains all expected rules', () => {
    EXPECTED_RULES.forEach(rule => {
      expect(DerivationRules[rule]).toBeDefined();
    });
  });
});

describe('moleculeArchetype - Derivation Rules', () => {
  const ARCHETYPE_TESTS = [
    {
      name: 'returns standard for empty atoms',
      atoms: [],
      expected: { type: 'standard', severity: 1 },
    },
    {
      name: 'detects network-hub archetype',
      build: () => TestScenarioBuilder.create()
        .addExportedAtom('net1', [b => b.asFragileNetwork()])
        .addExportedAtom('net2', [b => b.asFragileNetwork()])
        .buildAtoms(),
      expected: { type: 'network-hub', severity: 8 },
    },
    {
      name: 'detects internal-module archetype',
      build: () => TestScenarioBuilder.create()
        .addPrivateAtom('priv1')
        .addPrivateAtom('priv2')
        .buildAtoms(),
      expected: { type: 'internal-module' },
    },
    {
      name: 'detects critical-module archetype',
      build: () => TestScenarioBuilder.create()
        .addAtom(b => b.asHotPath())
        .addAtom(b => b.asHotPath())
        .buildAtoms(),
      expected: { type: 'critical-module', severity: 9 },
    },
    {
      name: 'detects god-object archetype',
      build: () => TestScenarioBuilder.create()
        .addAtom(b => b.asGodFunction())
        .buildAtoms(),
      expected: { type: 'god-object', severity: 10 },
    },
    {
      name: 'detects validation-module archetype',
      build: () => TestScenarioBuilder.create()
        .addAtom(b => b.asValidator())
        .addAtom(b => b.asValidator())
        .buildAtoms(),
      expected: { type: 'validation-module' },
    },
  ];

  ARCHETYPE_TESTS.forEach(({ name, build, expected }) => {
    it(name, () => {
      const atoms = build ? build() : [];
      const result = moleculeArchetype(atoms);

      expect(result.type).toBe(expected.type);
      if (expected.severity !== undefined) {
        expect(result.severity).toBe(expected.severity);
      }
    });
  });
});

describe('moleculeComplexity - Derivation Rules', () => {
  const COMPLEXITY_TESTS = [
    {
      name: 'sums atom complexities',
      build: () => TestScenarioBuilder.create()
        .addAtom(b => b.withComplexity(5))
        .addAtom(b => b.withComplexity(10))
        .addAtom(b => b.withComplexity(3))
        .buildAtoms(),
      expected: 18,
    },
    {
      name: 'handles zero complexity',
      build: () => TestScenarioBuilder.create()
        .addAtom(b => b.withComplexity(0))
        .buildAtoms(),
      expected: 0,
    },
    {
      name: 'handles empty atoms',
      build: () => [],
      expected: 0,
    },
    {
      name: 'handles missing complexity',
      build: () => TestScenarioBuilder.create()
        .addAtom(b => b.withoutField('complexity'))
        .buildAtoms(),
      expected: 0,
    },
  ];

  COMPLEXITY_TESTS.forEach(({ name, build, expected }) => {
    it(name, () => {
      const atoms = build();
      expect(moleculeComplexity(atoms)).toBe(expected);
    });
  });
});

describe('moleculeRisk - Derivation Rules', () => {
  it('calculates risk from atoms', () => {
    const { atoms } = TestScenarioBuilder.create()
      .addAtom(b => b.withComplexity(10).asFragileNetwork())
      .build();

    expect(moleculeRisk(atoms)).toBeGreaterThan(0);
  });
});

describe('moleculeExports - Derivation Rules', () => {
  it('returns list of exported atom names', () => {
    const { atoms } = TestScenarioBuilder.create()
      .addExportedAtom('exp1')
      .addExportedAtom('exp2')
      .addPrivateAtom('priv')
      .build();

    const result = moleculeExports(atoms);

    expect(result).toEqual(['exp1', 'exp2']);
  });

  it('returns empty array for no exports', () => {
    const { atoms } = TestScenarioBuilder.create()
      .addPrivateAtom('priv')
      .build();

    expect(moleculeExports(atoms)).toEqual([]);
  });
});

describe('moleculeExportCount - Derivation Rules', () => {
  it('counts exported atoms', () => {
    const { atoms } = TestScenarioBuilder.create()
      .addExportedAtom('exp1')
      .addExportedAtom('exp2')
      .addPrivateAtom('priv')
      .build();

    expect(moleculeExportCount(atoms)).toBe(2);
  });
});

describe('moleculeFunctionCount - Derivation Rules', () => {
  it('counts all atoms', () => {
    const { atoms } = TestScenarioBuilder.create()
      .addAtom(() => {})
      .addAtom(() => {})
      .addAtom(() => {})
      .build();

    expect(moleculeFunctionCount(atoms)).toBe(3);
  });

  it('handles empty array', () => {
    expect(moleculeFunctionCount([])).toBe(0);
  });
});

describe('moleculeHasSideEffects - Derivation Rules', () => {
  const SIDE_EFFECT_TESTS = [
    {
      name: 'returns true when any atom has side effects',
      build: () => TestScenarioBuilder.create()
        .addAtom(b => b.withNetworkCalls())
        .addAtom(() => {})
        .buildAtoms(),
      expected: true,
    },
    {
      name: 'returns false when no atoms have side effects',
      build: () => TestScenarioBuilder.create()
        .addAtom(() => {})
        .addAtom(() => {})
        .buildAtoms(),
      expected: false,
    },
  ];

  SIDE_EFFECT_TESTS.forEach(({ name, build, expected }) => {
    it(name, () => {
      const atoms = build();
      expect(moleculeHasSideEffects(atoms)).toBe(expected);
    });
  });
});

describe('moleculeHasNetworkCalls - Derivation Rules', () => {
  const NETWORK_TESTS = [
    {
      name: 'detects network calls',
      build: () => TestScenarioBuilder.create()
        .addAtom(b => b.withNetworkCalls())
        .buildAtoms(),
      expected: true,
    },
    {
      name: 'returns false without network calls',
      build: () => TestScenarioBuilder.create()
        .addAtom(() => {})
        .buildAtoms(),
      expected: false,
    },
  ];

  NETWORK_TESTS.forEach(({ name, build, expected }) => {
    it(name, () => {
      const atoms = build();
      expect(moleculeHasNetworkCalls(atoms)).toBe(expected);
    });
  });
});

describe('moleculeHasDomManipulation - Derivation Rules', () => {
  it('detects DOM manipulation', () => {
    const { atoms } = TestScenarioBuilder.create()
      .addAtom(b => b.withDomManipulation())
      .build();

    expect(moleculeHasDomManipulation(atoms)).toBe(true);
  });
});

describe('moleculeHasStorageAccess - Derivation Rules', () => {
  it('detects storage access', () => {
    const { atoms } = TestScenarioBuilder.create()
      .addAtom(b => b.withStorageAccess())
      .build();

    expect(moleculeHasStorageAccess(atoms)).toBe(true);
  });
});

describe('moleculeHasErrorHandling - Derivation Rules', () => {
  it('detects error handling', () => {
    const { atoms } = TestScenarioBuilder.create()
      .addAtom(b => b.withInvalidType('hasErrorHandling', true))
      .build();

    expect(moleculeHasErrorHandling(atoms)).toBe(true);
  });
});

describe('moleculeHasAsyncPatterns - Derivation Rules', () => {
  it('detects async patterns', () => {
    const { atoms } = TestScenarioBuilder.create()
      .addAtom(b => b.asAsync())
      .build();

    expect(moleculeHasAsyncPatterns(atoms)).toBe(true);
  });
});

describe('moleculeExternalCallCount - Derivation Rules', () => {
  it('sums external calls', () => {
    const atom1 = AtomBuilder.create('test.js::func1').build();
    atom1.calls = [
      { type: 'external', name: 'api1' },
      { type: 'external', name: 'api2' },
      { type: 'internal', name: 'local' },
    ];
    const atom2 = AtomBuilder.create('test.js::func2').build();
    atom2.calls = [
      { type: 'external', name: 'api3' },
      { type: 'external', name: 'api4' },
    ];

    expect(moleculeExternalCallCount([atom1, atom2])).toBe(4);
  });
});

describe('moleculeNetworkEndpoints - Derivation Rules', () => {
  it('collects network endpoints', () => {
    const atom1 = AtomBuilder.create('test.js::func1').build();
    atom1.networkEndpoints = ['https://api.example.com/users'];
    const atom2 = AtomBuilder.create('test.js::func2').build();
    atom2.networkEndpoints = ['https://api.example.com/posts'];

    const result = moleculeNetworkEndpoints([atom1, atom2]);
    expect(result.length).toBe(2);
  });
});

describe('moleculeHasLifecycleHooks - Derivation Rules', () => {
  it('detects lifecycle hooks', () => {
    const atom = AtomBuilder.create('test.js::func1').build();
    atom.hasLifecycleHooks = true;

    expect(moleculeHasLifecycleHooks([atom])).toBe(true);
  });
});

describe('moleculeHasCleanupPatterns - Derivation Rules', () => {
  it('detects cleanup patterns', () => {
    const atom = AtomBuilder.create('test.js::func1').build();
    atom.hasLifecycleHooks = true;
    atom.hasCleanupPatterns = true;

    expect(moleculeHasCleanupPatterns([atom])).toBe(true);
  });
});

describe('composeMolecularMetadata - Full Composition', () => {
  const COMPOSITION_TESTS = [
    {
      name: 'composes complete molecular metadata',
      build: () => TestScenarioBuilder.create()
        .withFilePath('test.js')
        .addExportedAtom('func1', [b => b.withComplexity(5)])
        .addExportedAtom('func2', [b => b.withComplexity(10)])
        .build(),
      assertions: (result) => {
        expect(result.id).toBe('test.js');
        expect(result.type).toBe('molecule');
        expect(result.atomCount).toBe(2);
        expect(result.totalComplexity).toBe(15);
        expect(result.exportCount).toBe(2);
        expect(result.derivedAt).toBeDefined();
        expect(result.derivationSource).toBe('atomic-composition');
      },
    },
    {
      name: 'includes all derived fields',
      build: () => TestScenarioBuilder.create()
        .withFilePath('network.js')
        .addExportedAtom('func1', [b => b.withNetworkCalls()])
        .build(),
      assertions: (result) => {
        expect(result.hasNetworkCalls).toBe(true);
        expect(result.hasSideEffects).toBe(true);
        expect(result.archetype).toBeDefined();
      },
    },
    {
      name: 'handles empty atoms array',
      build: () => ({ atoms: [], filePath: 'empty.js' }),
      assertions: (result) => {
        expect(result.atomCount).toBe(0);
        expect(result.exportCount).toBe(0);
        expect(result.totalComplexity).toBe(0);
      },
    },
  ];

  COMPOSITION_TESTS.forEach(({ name, build, assertions }) => {
    it(name, () => {
      const { atoms, filePath } = build();
      const result = composeMolecularMetadata(filePath, atoms);
      assertions(result);
    });
  });
});

describe('createComposer - Factory Function', () => {
  const COMPOSER_TESTS = [
    {
      name: 'creates composer with cache',
      test: () => {
        const composer = createComposer();
        expect(composer.compose).toBeDefined();
        expect(composer.getStats).toBeDefined();
        expect(composer.invalidate).toBeDefined();
        expect(composer.clear).toBeDefined();
      },
    },
    {
      name: 'composer caches derivations',
      test: () => {
        const composer = createComposer();
        const { atoms } = TestScenarioBuilder.create().build();

        composer.compose('test.js', atoms);
        composer.compose('test.js', atoms);

        const stats = composer.getStats();
        expect(stats.hits).toBeGreaterThan(0);
      },
    },
    {
      name: 'composer.invalidate clears by atom',
      test: () => {
        const composer = createComposer();
        const atom = AtomBuilder.create('test.js::func1').build();

        composer.compose('test.js', [atom]);
        composer.invalidate(atom.id);

        expect(composer.getStats().cacheSize).toBe(0);
      },
    },
    {
      name: 'composer.clear resets everything',
      test: () => {
        const composer = createComposer();
        const { atoms } = TestScenarioBuilder.create().build();

        composer.compose('test.js', atoms);
        composer.clear();

        expect(composer.getStats().cacheSize).toBe(0);
      },
    },
  ];

  COMPOSER_TESTS.forEach(({ name, test }) => {
    it(name, test);
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

    const { atoms } = TestScenarioBuilder.create()
      .withFilePath(`${tempDir}/api.js`)
      .addExportedAtom('fetchUsers', [b => b.asAsync().withNetworkCalls().withComplexity(5)])
      .addExportedAtom('processUsers', [b => b.withComplexity(3)])
      .addPrivateAtom('internalHelper', [b => b.withComplexity(1)])
      .build();

    const result = composeMolecularMetadata(`${tempDir}/api.js`, atoms);

    expect(result.exportCount).toBe(2);
    expect(result.functionCount).toBe(3);
    expect(result.hasNetworkCalls).toBe(true);
    expect(result.hasAsyncPatterns).toBe(true);
  });

  it('composes metadata for complex module', async () => {
    const { atoms } = TestScenarioBuilder.create()
      .withFilePath('complex.js')
      .addExportedAtom('api1', [b => b.asFragileNetwork().withComplexity(15)])
      .addExportedAtom('api2', [b => b.asFragileNetwork().withComplexity(12)])
      .addExportedAtom('util', [b => b.withComplexity(3)])
      .build();

    const result = composeMolecularMetadata('complex.js', atoms);

    expect(result.archetype.type).toBe('network-hub');
    expect(result.totalComplexity).toBe(30);
    expect(result.exportCount).toBe(3);
  });
});
