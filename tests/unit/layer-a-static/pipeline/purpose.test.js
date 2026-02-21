/**
 * @fileoverview Tests for purpose.js — detectAtomPurpose + recalculatePurposes
 * Pure functions — no mocks needed.
 */

import { describe, it, expect } from 'vitest';
import {
  detectAtomPurpose,
  recalculatePurposes,
  ATOM_PURPOSES
} from '#layer-a/pipeline/phases/atom-extraction/metadata/purpose.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function atom(overrides = {}) {
  return {
    isExported: false,
    name: 'testFn',
    functionType: 'declaration',
    lifecycleHooks: [],
    temporal: { patterns: { events: [], timers: [] } },
    isAsync: false,
    hasSideEffects: false,
    hasNetworkCalls: false,
    hasDomManipulation: false,
    networkEndpoints: [],
    calledBy: [],
    archetype: { type: 'standard' },
    ...overrides
  };
}

// ── ATOM_PURPOSES catalog ─────────────────────────────────────────────────────

describe('ATOM_PURPOSES catalog', () => {
  it('contains all expected purpose keys', () => {
    const expected = [
      'API_EXPORT', 'EVENT_HANDLER', 'TEST_HELPER', 'TIMER_ASYNC',
      'NETWORK_HANDLER', 'INTERNAL_HELPER', 'PRIVATE_HELPER',
      'CONFIG_SETUP', 'SCRIPT_MAIN', 'ANALYSIS_SCRIPT', 'CLASS_METHOD', 'DEAD_CODE'
    ];
    for (const key of expected) {
      expect(ATOM_PURPOSES).toHaveProperty(key);
    }
  });

  it('DEAD_CODE is the only purpose with isDead: true', () => {
    const deadOnes = Object.entries(ATOM_PURPOSES).filter(([, v]) => v.isDead);
    expect(deadOnes.map(([k]) => k)).toEqual(['DEAD_CODE']);
  });

  it('PRIVATE_HELPER has isDead: false', () => {
    expect(ATOM_PURPOSES.PRIVATE_HELPER.isDead).toBe(false);
  });
});

// ── detectAtomPurpose — Check 1: exported ────────────────────────────────────

describe('detectAtomPurpose — exported functions', () => {
  it('returns API_EXPORT for exported atoms', () => {
    const result = detectAtomPurpose(atom({ isExported: true }), 'src/foo.js');
    expect(result.purpose).toBe('API_EXPORT');
    expect(result.isDeadCode).toBe(false);
    expect(result.purposeConfidence).toBe(1.0);
  });
});

// ── detectAtomPurpose — Check 2: test files ──────────────────────────────────

describe('detectAtomPurpose — test file paths', () => {
  const testPaths = [
    'src/foo.test.js',
    'src/foo.spec.js',
    'tests/unit/foo.js',
    'src/__tests__/foo.js',
    'test-cases/foo.js'
  ];

  for (const filePath of testPaths) {
    it(`returns TEST_HELPER for ${filePath}`, () => {
      const result = detectAtomPurpose(atom(), filePath);
      expect(result.purpose).toBe('TEST_HELPER');
      expect(result.isDeadCode).toBe(false);
    });
  }
});

// ── detectAtomPurpose — Check 3: scripts ─────────────────────────────────────

describe('detectAtomPurpose — script files', () => {
  it('returns ANALYSIS_SCRIPT for audit script', () => {
    const result = detectAtomPurpose(atom({ name: 'auditFiles' }), 'scripts/audit-something.js');
    expect(result.purpose).toBe('ANALYSIS_SCRIPT');
    expect(result.isDeadCode).toBe(false);
  });

  it('returns SCRIPT_MAIN for non-audit script', () => {
    const result = detectAtomPurpose(atom({ name: 'main' }), 'scripts/start-server.js');
    expect(result.purpose).toBe('SCRIPT_MAIN');
    expect(result.isDeadCode).toBe(false);
  });

  it('detects analysis by function name even in generic script', () => {
    const result = detectAtomPurpose(atom({ name: 'validateConfig' }), 'scripts/tool.js');
    expect(result.purpose).toBe('ANALYSIS_SCRIPT');
  });
});

// ── detectAtomPurpose — Check 4: config files ────────────────────────────────

describe('detectAtomPurpose — config files', () => {
  it('returns CONFIG_SETUP for /config/ path', () => {
    const result = detectAtomPurpose(atom(), 'src/config/settings.js');
    expect(result.purpose).toBe('CONFIG_SETUP');
    expect(result.isDeadCode).toBe(false);
  });
});

// ── detectAtomPurpose — Check 5: class methods ───────────────────────────────

describe('detectAtomPurpose — class methods', () => {
  it('returns CLASS_METHOD for method functionType', () => {
    const result = detectAtomPurpose(atom({ functionType: 'method' }), 'src/foo.js');
    expect(result.purpose).toBe('CLASS_METHOD');
    expect(result.isDeadCode).toBe(false);
  });

  it('returns CLASS_METHOD when className is set', () => {
    const result = detectAtomPurpose(atom({ className: 'MyClass' }), 'src/foo.js');
    expect(result.purpose).toBe('CLASS_METHOD');
  });
});

// ── detectAtomPurpose — Check 6: lifecycle hooks ─────────────────────────────

describe('detectAtomPurpose — lifecycle/events', () => {
  it('returns EVENT_HANDLER when lifecycleHooks present', () => {
    const a = atom({ lifecycleHooks: ['componentDidMount'] });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('EVENT_HANDLER');
    expect(result.isDeadCode).toBe(false);
  });

  it('returns EVENT_HANDLER when temporal events present', () => {
    const a = atom({ temporal: { patterns: { events: ['click'], timers: [] } } });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('EVENT_HANDLER');
  });
});

// ── detectAtomPurpose — Check 7: timer/async ────────────────────────────────

describe('detectAtomPurpose — timers and async', () => {
  it('returns TIMER_ASYNC when temporal timers present', () => {
    const a = atom({ temporal: { patterns: { events: [], timers: ['setTimeout'] } } });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('TIMER_ASYNC');
    expect(result.isDeadCode).toBe(false);
  });

  it('returns TIMER_ASYNC when async + hasSideEffects', () => {
    const a = atom({ isAsync: true, hasSideEffects: true });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('TIMER_ASYNC');
  });

  it('does NOT return TIMER_ASYNC for async without side effects', () => {
    const a = atom({ isAsync: true, hasSideEffects: false });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).not.toBe('TIMER_ASYNC');
  });
});

// ── detectAtomPurpose — Check 8: network ─────────────────────────────────────

describe('detectAtomPurpose — network calls', () => {
  it('returns NETWORK_HANDLER when hasNetworkCalls', () => {
    const a = atom({ hasNetworkCalls: true });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('NETWORK_HANDLER');
    expect(result.isDeadCode).toBe(false);
  });

  it('returns NETWORK_HANDLER when networkEndpoints present', () => {
    const a = atom({ networkEndpoints: ['https://api.example.com'] });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('NETWORK_HANDLER');
  });
});

// ── detectAtomPurpose — Check 9: DOM ─────────────────────────────────────────

describe('detectAtomPurpose — DOM manipulation', () => {
  it('returns EVENT_HANDLER when hasDomManipulation', () => {
    const a = atom({ hasDomManipulation: true });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('EVENT_HANDLER');
    expect(result.isDeadCode).toBe(false);
  });
});

// ── detectAtomPurpose — Check 10: archetypes ─────────────────────────────────

describe('detectAtomPurpose — archetype clues', () => {
  it('returns API_EXPORT for hot-path archetype', () => {
    const a = atom({ archetype: { type: 'hot-path' } });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('API_EXPORT');
  });

  it('returns INTERNAL_HELPER for validator archetype', () => {
    const a = atom({ archetype: { type: 'validator' } });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('INTERNAL_HELPER');
  });

  it('returns INTERNAL_HELPER for transformer archetype', () => {
    const a = atom({ archetype: { type: 'transformer' } });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('INTERNAL_HELPER');
  });

  it('returns CLASS_METHOD for class-method archetype', () => {
    const a = atom({ archetype: { type: 'class-method' }, className: 'Foo' });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('CLASS_METHOD');
  });
});

// ── detectAtomPurpose — Check final: calledBy ───────────────────────────────

describe('detectAtomPurpose — calledBy fallback', () => {
  it('returns INTERNAL_HELPER when calledBy has entries', () => {
    const a = atom({ calledBy: ['src/foo.js::otherFn'] });
    const result = detectAtomPurpose(a, 'src/foo.js');
    expect(result.purpose).toBe('INTERNAL_HELPER');
    expect(result.isDeadCode).toBe(false);
  });
});

// ── detectAtomPurpose — Default: DEAD_CODE ───────────────────────────────────

describe('detectAtomPurpose — dead code default', () => {
  it('returns DEAD_CODE when no evidence of use', () => {
    const result = detectAtomPurpose(atom(), 'src/foo.js');
    expect(result.purpose).toBe('DEAD_CODE');
    expect(result.isDeadCode).toBe(true);
    expect(result.purposeConfidence).toBe(0.5);
  });
});

// ── recalculatePurposes ───────────────────────────────────────────────────────

describe('recalculatePurposes', () => {
  it('upgrades DEAD_CODE atoms with calledBy to PRIVATE_HELPER', () => {
    const atoms = [
      {
        purpose: 'DEAD_CODE',
        isDeadCode: true,
        calledBy: ['src/foo.js::caller'],
        purposeConfidence: 0.5
      }
    ];

    recalculatePurposes(atoms);

    expect(atoms[0].purpose).toBe('PRIVATE_HELPER');
    expect(atoms[0].isDeadCode).toBe(false);
    expect(atoms[0].purposeConfidence).toBe(0.95);
    expect(atoms[0].purposeReason).toContain('1 sibling atom');
  });

  it('leaves DEAD_CODE atoms without calledBy unchanged', () => {
    const atoms = [
      { purpose: 'DEAD_CODE', isDeadCode: true, calledBy: [] }
    ];

    recalculatePurposes(atoms);

    expect(atoms[0].purpose).toBe('DEAD_CODE');
    expect(atoms[0].isDeadCode).toBe(true);
  });

  it('does not touch atoms already classified as non-DEAD_CODE', () => {
    const atoms = [
      { purpose: 'API_EXPORT', isDeadCode: false, calledBy: [] },
      { purpose: 'INTERNAL_HELPER', isDeadCode: false, calledBy: ['x'] }
    ];

    recalculatePurposes(atoms);

    expect(atoms[0].purpose).toBe('API_EXPORT');
    expect(atoms[1].purpose).toBe('INTERNAL_HELPER');
  });

  it('handles mixed array of dead and live atoms', () => {
    const atoms = [
      { purpose: 'DEAD_CODE', isDeadCode: true, calledBy: ['caller1', 'caller2'] },
      { purpose: 'API_EXPORT', isDeadCode: false, calledBy: [] },
      { purpose: 'DEAD_CODE', isDeadCode: true, calledBy: [] }
    ];

    recalculatePurposes(atoms);

    expect(atoms[0].purpose).toBe('PRIVATE_HELPER');
    expect(atoms[0].purposeReason).toContain('2 sibling atom');
    expect(atoms[1].purpose).toBe('API_EXPORT');
    expect(atoms[2].purpose).toBe('DEAD_CODE'); // no callers — stays dead
  });

  it('handles empty array', () => {
    expect(() => recalculatePurposes([])).not.toThrow();
  });
});
