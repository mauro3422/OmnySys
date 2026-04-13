import { describe, expect, it } from 'vitest';

import {
  buildCompilerSystemInventoryReport,
  buildCompilerSystemInventorySnapshot,
  summarizeCompilerSystemInventory
} from '../../../../src/shared/compiler/system-inventory/summary.js';

function createExplainability() {
  return {
    policySummary: {
      total: 3,
      high: 1,
      medium: 2,
      byPolicyArea: {
        propagation_expansion: 1,
        compiler_policy: 2
      }
    },
    standardization: {
      summary: {
        adoptionGapCount: 2,
        missingCanonicalApiCount: 1,
        missingCanonicalSurfaceCount: 1,
        nextAction: 'Adopt the missing canonical surface before adding new wrappers.'
      },
      missingCanonicalApis: [
        {
          id: 'runtime_boundary_surfaces',
          severity: 'high',
          reason: 'Runtime boundary drift is still being surfaced in handler code.',
          recommendation: 'Promote runtime boundary checks into a canonical API.'
        }
      ],
      missingCanonicalSurfaces: [
        {
          id: 'metadata_propagation_surfaces',
          severity: 'high',
          reason: 'Producer/consumer metadata propagation is not fully canonical.',
          recommendation: 'Introduce a canonical metadata propagation API.'
        }
      ]
    },
    compilerContractLayer: {
      surfaces: [
        {
          id: 'atoms',
          kind: 'table',
          status: 'canonical',
          sourceOfTruth: true,
          surface: 'atoms',
          summary: 'Primary atom graph.'
        },
        {
          id: 'system_files',
          kind: 'table',
          status: 'mirrored_support',
          sourceOfTruth: false,
          surface: 'system_files',
          backingSurface: 'files',
          summary: 'Mirrored support metadata surface.'
        },
        {
          id: 'semantic_connections',
          kind: 'table',
          status: 'advisory',
          sourceOfTruth: false,
          surface: 'semantic_connections',
          summary: 'Advisory semantic summary.'
        }
      ],
      canonicalEntrypoints: [
        {
          id: 'metadata_extraction_coverage',
          status: 'canonical',
          entrypoint: 'getMetadataExtractionCoverage',
          domain: 'metadata_surfaces'
        }
      ],
      apiGovernance: {
        currentCreationCandidates: [
          {
            id: 'file_universe_contracts',
            severity: 'medium',
            reason: 'Scanner and live file universes need a canonical contract.',
            recommendation: 'Expose a canonical file universe API.'
          }
        ]
      },
      summary: {
        canonicalWrapperFindings: 0,
        canonicalBypassFindings: 0,
        parallelCanonicalSurfaceFindings: 1,
        nextAction: 'Create the missing canonical API.'
      }
    },
    driftAssessment: {
      primaryIssue: {
        key: 'propagation_expansion',
        state: 'drifting',
        recommendation: 'Expand propagation surfaces where needed.'
      },
      signals: [
        {
          key: 'propagation_expansion',
          state: 'drifting',
          recommendation: 'Expand propagation surfaces where needed.'
        }
      ]
    },
      policyCoverage: {
        coverageState: 'watching',
        coverageScore: 77,
        coverageRatio: 0.5,
        coverageLoad: 8,
      totalSystemCount: 16,
      canonicalSurfaceCount: 4,
      canonicalEntrypointCount: 2,
      bridgeSystemCount: 1,
      wrapperSystemCount: 1,
      emergentSystemCount: 0,
      policyDriftCount: 3,
      propagationExpansionState: 'drifting',
      nextAction: 'Attach the canonical propagation plan.',
      recommendation: 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.',
      summaryText: 'coverage=watching | score=77 | load=8/16 | drift=3 | expansion=drifting',
      inventoryState: 'watching'
    },
      inventorySignals: {
        total: 10,
        byType: {
          canonical_like: 6,
          bridge_like: 2,
          unknown: 2
        },
        byRole: {
          canonical: 6,
          bridge: 2,
          wrapper: 2
        },
        recent: []
      },
      historyStores: {
        archiveDir: '.omnysysdata',
        totalStores: 2,
        readyStoreCount: 2,
        missingStoreCount: 0,
        state: 'ready',
        summaryText: 'health=ready | atom=ready | ready=2/2',
        stores: [
          { label: 'health-history.db', state: 'ready', exists: true, sizeBytes: 2048 },
          { label: 'atom-history.db', state: 'ready', exists: true, sizeBytes: 4096 }
        ]
      }
    };
  }

describe('system inventory summary', () => {
  it('builds a canonical inventory report with emergent and bridge systems', () => {
    const explainability = createExplainability();
    const inventory = buildCompilerSystemInventorySnapshot({
      projectPath: 'C:/Dev/OmnySystem',
      scopePath: 'src/shared/compiler',
      focusPath: 'src/shared/compiler/status-system-table.js',
      compilerExplainability: explainability,
      historyStores: explainability.historyStores,
      toolInventory: {
        totalTools: 40,
        dominantCategory: 'action',
        dominantSubgroup: 'file_watcher',
        concentration: 52,
        categoryConcentration: 48,
        noiseSummary: {
          totalRuns: 100,
          noisyRunCount: 40,
          noisyToolCount: 6,
          noiseRate: 0.4,
          noiseScore: 42,
          noiseTopTools: [],
          topReasons: []
        },
        topTools: []
      },
      limit: 10
    });
    const report = buildCompilerSystemInventoryReport(inventory);
    const summary = summarizeCompilerSystemInventory(inventory);

    expect(report.inventoryState).toBe('watching');
    expect(report.canonicalSurfaceCount).toBeGreaterThan(0);
    expect(report.canonicalEntrypointCount).toBeGreaterThan(0);
    expect(report.emergentSystemCount).toBeGreaterThan(0);
    expect(report.bridgeSystemCount).toBeGreaterThan(0);
    expect(report.wrapperSystemCount).toBeGreaterThan(0);
    expect(report.totalSystemCount).toBeGreaterThanOrEqual(report.canonicalSurfaceCount);
    expect(report.policyCoverageState).toBe('watching');
    expect(report.policyCoverageScore).toBe(77);
    expect(report.policyCoverage.summaryText).toContain('coverage=watching');
    expect(report.summaryText).toContain('canonical=');
    expect(report.summaryText).toContain('emergent=');
    expect(report.summaryText).toContain('coverage=');
    expect(report.integrationCoveragePct).toBe(80);
    expect(report.summaryText).toContain('integration=80%');
    expect(report.historyStoreState).toBe('ready');
    expect(report.historyStoreCount).toBe(2);
    expect(report.summaryText).toContain('history=2/2');
    expect(report.nextAction).toMatch(/canonical|surface/i);
    expect(Array.isArray(report.topSystems)).toBe(true);
    expect(report.topPromotionCandidates[0].role).toBe('emergent');
    expect(summary.inventoryState).toBe(report.inventoryState);
  });
});
