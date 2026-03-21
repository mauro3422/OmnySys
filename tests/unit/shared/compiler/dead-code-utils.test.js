import { describe, expect, it } from 'vitest';
import {
  isSuspiciousDeadCodeAtom,
  normalizeDeadCodeAtom
} from '../../../../src/shared/compiler/dead-code-core.js';
import {
  buildDeadCodeRemediationPlan,
  getDeadCodePlausibilitySummary
} from '../../../../src/shared/compiler/dead-code-reporting.js';

function createFakeDb({ flagged = 0, suspicious = 0, candidates = [] } = {}) {
  return {
    prepare(sql) {
      const normalized = String(sql);

      if (normalized.includes('COUNT(*) AS total') && normalized.includes('is_dead_code = 1')) {
        return {
          get: () => ({ total: flagged })
        };
      }

      if (normalized.includes('COUNT(*) AS total') && normalized.includes('FROM atoms')) {
        return {
          get: () => ({ total: suspicious })
        };
      }

      if (normalized.includes('SELECT') && normalized.includes('LIMIT ?')) {
        return {
          all: () => candidates
        };
      }

      return {
        get: () => ({ total: 0 }),
        all: () => []
      };
    }
  };
}

describe('dead-code core heuristics', () => {
  it('normalizes atom aliases without losing connectivity data', () => {
    const normalized = normalizeDeadCodeAtom({
      id: 1,
      name: 'orphanFn',
      atom_type: 'function',
      file_path: 'src/a.js',
      is_exported: 1,
      callers_count: 0,
      callees_count: 0
    });

    expect(normalized).toMatchObject({
      id: 1,
      name: 'orphanFn',
      type: 'function',
      filePath: 'src/a.js',
      isExported: true,
      callersCount: 0,
      calleesCount: 0
    });
  });

  it('flags disconnected non-exported functions as suspicious dead code', () => {
    expect(isSuspiciousDeadCodeAtom({
      name: 'orphanFn',
      type: 'function',
      filePath: 'src/a.js',
      linesOfCode: 12,
      callersCount: 0,
      calleesCount: 0
    }, { minLines: 5 })).toBe(true);
  });

  it('keeps exported atoms out unless explicitly allowed', () => {
    const atom = {
      name: 'exportedFn',
      type: 'function',
      filePath: 'src/a.js',
      linesOfCode: 12,
      isExported: true
    };

    expect(isSuspiciousDeadCodeAtom(atom, { minLines: 5 })).toBe(false);
    expect(isSuspiciousDeadCodeAtom(atom, { minLines: 5, allowExported: true })).toBe(true);
  });

  it('ignores low-signal callback names', () => {
    expect(isSuspiciousDeadCodeAtom({
      name: 'then_callback',
      type: 'function',
      filePath: 'src/a.js',
      linesOfCode: 20
    }, { minLines: 5 })).toBe(false);
  });
});

describe('dead-code reporting', () => {
  it('builds a plausibility warning when suspicious candidates outnumber flagged dead code', () => {
    const db = createFakeDb({ flagged: 0, suspicious: 60 });
    const summary = getDeadCodePlausibilitySummary(db, { minLines: 5, suspiciousThreshold: 50 });

    expect(summary.hasCoverageGap).toBe(true);
    expect(summary.warning?.field).toBe('dead_code');
  });

  it('builds a remediation plan from canonical dead-code candidates', () => {
    const db = createFakeDb({
      suspicious: 2,
      candidates: [
        {
          id: 1,
          name: 'orphanFn',
          file_path: 'src/a.js',
          atom_type: 'function',
          lines_of_code: 25,
          is_exported: 0
        }
      ]
    });

    const plan = buildDeadCodeRemediationPlan(db, { limit: 5, minLines: 5 });

    expect(plan.total).toBe(2);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].recommendedActions.length).toBeGreaterThan(0);
  });
});
