import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('#shared/compiler/trust-investigation-report.js', () => ({
  buildTrustInvestigationReport: vi.fn(async () => ({
    success: true,
    aggregationType: 'trust_investigation_report',
    projectPath: 'C:/Dev/OmnySystem',
    trust: {
      state: 'blocked',
      confidenceScore: 28,
      blockedCount: 3,
      watchingCount: 2,
      greenCount: 2,
      dbTrusted: true,
      controlPlaneTrusted: false,
      nextAction: 'Reconcile the blocked trust gates before treating the control plane as authoritative.'
    },
    summary: {
      oneLine: 'trust=blocked:28/100 | db=100/A+ | meta=84% | policy=117 | orphans=162 | tools=9 | atoms=14533 | files=2848',
      nextAction: 'Reconcile the blocked trust gates before treating the control plane as authoritative.'
    },
    gates: [],
    database: {
      health: { healthScore: 100, grade: 'A+' },
      liveCounts: { activeAtoms: 14533, activeFiles: 2848, activeCallRelations: 10225, activeSemanticConnections: 926 },
      metadataDrift: { activeAtomsDelta: 218, activeFilesDelta: 362 }
    },
    samples: {},
    inventory: {},
    issues: {},
    metadata: {},
    tools: {}
  })),
  summarizeTrustInvestigationReport: vi.fn(() => ({
    trustState: 'blocked',
    confidenceScore: 28,
    oneLine: 'trust=blocked:28/100 | db=100/A+ | meta=84% | policy=117 | orphans=162 | tools=9 | atoms=14533 | files=2848',
    nextAction: 'Reconcile the blocked trust gates before treating the control plane as authoritative.'
  }))
}));

const { buildTrustInvestigationReport } = await import('#shared/compiler/trust-investigation-report.js');
const { trustLogic, execute, aliases } = await import('#cli/commands/trust.js');

describe('trustLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a summarized trust report', async () => {
    const result = await trustLogic('C:/Dev/OmnySystem', { persist: false });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.summary.trustState).toBe('blocked');
    expect(buildTrustInvestigationReport).toHaveBeenCalled();
  });
});

describe('execute', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('exports aliases', () => {
    expect(aliases).toEqual(['trust', 'investigate', 'baseline']);
  });

  it('prints the trust report', async () => {
    await execute('C:/Dev/OmnySystem');

    expect(consoleSpy).toHaveBeenCalled();
    const loggedText = consoleSpy.mock.calls.map((call) => call[0]).join(' ');
    expect(loggedText).toContain('Trust Investigation');
    expect(loggedText).toContain('blocked');
  });
});
