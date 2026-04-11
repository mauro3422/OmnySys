import { describe, expect, it } from 'vitest';

import {
  buildCompilerControlPlane,
  summarizeCompilerControlPlane
} from '../../../../src/shared/compiler/compiler-control-plane.js';

function buildFixture(overrides = {}) {
  const base = {
    compilerExplainability: {
      metadataExtractionCoverage: {
        summary: {
          coveragePct: 100
        }
      },
      compilerContractLayer: {
        surfaces: [
          { id: 'atoms', surface: 'atoms', status: 'canonical', sourceOfTruth: true }
        ]
      },
      dataGatewayContract: {
        summary: {
          trustworthy: true,
          nextAction: 'Keep the data gateway contract attached.'
        }
      },
      surfaceAudit: {
        trustworthy: true,
        summary: {
          trustworthy: true,
          nextAction: 'Keep the surface audit aligned.'
        }
      },
      driftAssessment: {
        healthy: true,
        summary: {
          nextAction: 'No drift gaps detected.'
        },
        signals: [
          {
            key: 'propagation_expansion',
            state: 'fresh',
            reason: 'Propagation expansion is attached.',
            recommendation: 'Keep propagation attached.',
            sourceOfTruth: 'compiler drift assessment'
          }
        ]
      },
      databaseHealth: {
        healthy: true,
        summary: 'Database health is stable.'
      },
      folderization: {
        propagation: {
          changeType: 'folderization',
          decision: 'approve',
          mode: 'move_and_rewrite',
          connectedSystems: [
            { name: 'status_panel', role: 'visibility' },
            { name: 'health_snapshot', role: 'history' }
          ]
        },
        automation: {
          propagationAdoption: {
            adoptionState: 'ready',
            requiredSystemCount: 2,
            surfacedSystemCount: 2,
            missingSystemCount: 0,
            coverageRatio: 1,
            missingSystemNames: [],
            reason: 'All connected systems already surface the propagation pattern.',
            nextAction: 'All connected systems already surface the propagation pattern.'
          }
        }
      },
      policyCoverage: {
        coverageState: 'fresh',
        coverageScore: 100,
        summaryText: 'coverage=fresh | score=100',
        nextAction: 'Keep policy coverage attached.'
      }
    },
    systemInventoryDetail: {
      summary: {
        inventoryState: 'fresh',
        totalSystemCount: 4,
        canonicalSurfaceCount: 1,
        canonicalEntrypointCount: 1,
        emergentSystemCount: 0,
        bridgeSystemCount: 1,
        wrapperSystemCount: 1,
        metadataCoveragePct: 100,
        integrationCoveragePct: 100
      },
      canonicalSurfaces: [
        { id: 'atoms', surface: 'atoms', status: 'canonical', summary: 'Primary atom surface.' }
      ],
      canonicalEntrypoints: [
        { id: 'status_panel', entrypoint: 'buildStatusSummaryPayload', status: 'canonical', summary: 'Status entrypoint.' }
      ],
      bridgeSystems: [
        { id: 'system_files', surface: 'system_files', status: 'mirrored_support', summary: 'Bridge surface.' }
      ],
      wrapperSystems: [
        { id: 'semantic_connections', surface: 'semantic_connections', status: 'advisory', summary: 'Wrapper surface.' }
      ],
      emergentSystems: []
    },
    systemInventory: {
      inventoryState: 'fresh',
      metadataCoveragePct: 100,
      integrationCoveragePct: 100,
      summaryText: 'canonical=2 | bridge=1 | wrapper=1',
      nextAction: 'No inventory action required.',
      policyCoverage: {
        coverageState: 'fresh',
        coverageScore: 100,
        summaryText: 'coverage=fresh | score=100',
        nextAction: 'Keep policy coverage attached.'
      },
      topSystems: [
        { name: 'atoms', role: 'canonical' },
        { name: 'status_panel', role: 'canonical' }
      ],
      summary: {
        inventoryState: 'fresh',
        totalSystemCount: 4,
        canonicalSurfaceCount: 1,
        canonicalEntrypointCount: 1,
        emergentSystemCount: 0,
        bridgeSystemCount: 1,
        wrapperSystemCount: 1,
        legacySystemCount: 0,
        policyDriftCount: 0,
        missingCanonicalApiCount: 0,
        missingCanonicalSurfaceCount: 0,
        metadataCoveragePct: 100,
        integrationCoveragePct: 100
      }
    },
    canonicalPromotion: {
      promotionState: 'watching',
      summaryText: 'No promotion needed.'
    },
    metricsSnapshot: {
      current: {
        behaviorState: 'watchful',
        mvpReady: true,
        summaryText: 'metrics ready'
      },
      summary: 'metrics ready'
    },
    healthDashboard: {
      status: 'ready',
      summary: 'dashboard ready'
    },
    healthPanel: {
      status: 'ready',
      summary: 'panel ready'
    },
    observability: {
      state: 'ready',
      trustworthy: true,
      summary: 'observability=ready',
      signals: [
        {
          key: 'policy',
          state: 'fresh',
          healthy: true,
          trustworthy: true,
          reason: 'Policy is fresh.',
          recommendation: 'Keep policy coverage attached.',
          sourceOfTruth: 'policy coverage'
        },
        {
          key: 'propagation',
          state: 'fresh',
          healthy: true,
          trustworthy: true,
          reason: 'Propagation is fresh.',
          recommendation: 'Keep propagation attached.',
          sourceOfTruth: 'compiler drift assessment'
        }
      ]
    },
    startupTelemetry: {
      state: 'fresh',
      summary: 'startup fresh'
    }
  };

  return {
    ...base,
    ...overrides
  };
}

describe('compiler-control-plane', () => {
  it('builds a ready registry when contracts, propagation and telemetry are aligned', () => {
    const controlPlane = buildCompilerControlPlane(buildFixture());
    const summary = summarizeCompilerControlPlane(controlPlane);

    expect(controlPlane.state).toBe('ready');
    expect(['aligned', 'watching']).toContain(controlPlane.metricAlignment.state);
    expect(controlPlane.telemetry.state).toBe('watching');
    expect(controlPlane.propagation.state).toBe('ready');
    expect(controlPlane.gaps).toEqual([]);
    expect(controlPlane.systems.total).toBe(4);
    expect(summary.state).toBe('ready');
    expect(['aligned', 'watching']).toContain(summary.metricAlignment.state);
    expect(summary.telemetry.requiredMissingCount).toBe(0);
    expect(summary.propagation.missingSystemCount).toBe(0);
  });

  it('surfaces blocked gaps when propagation, policy and telemetry drift apart', () => {
    const controlPlane = buildCompilerControlPlane(buildFixture({
      compilerExplainability: {
        ...buildFixture().compilerExplainability,
        metadataExtractionCoverage: {
          summary: {
            coveragePct: 84
          }
        },
        driftAssessment: {
          healthy: false,
          summary: {
            nextAction: 'Attach propagation where missing.'
          },
          signals: [
            {
              key: 'propagation_expansion',
              state: 'stale',
              reason: 'Propagation expansion is missing in some consumers.',
              recommendation: 'Attach propagation where missing.',
              sourceOfTruth: 'compiler drift assessment'
            }
          ]
        },
        folderization: {
          propagation: {
            changeType: 'folderization',
            decision: 'review',
            mode: 'move_and_rewrite',
            connectedSystems: [
              { name: 'status_panel', role: 'visibility' },
              { name: 'health_snapshot', role: 'history' },
              { name: 'compiler_explainability', role: 'explainability' },
              { name: 'drift_assessment', role: 'governance' }
            ]
          },
          automation: {
            propagationAdoption: {
              adoptionState: 'stale',
              requiredSystemCount: 4,
              surfacedSystemCount: 2,
              missingSystemCount: 2,
              coverageRatio: 0.5,
              missingSystemNames: ['compiler_explainability', 'drift_assessment'],
              missingSystems: [
                { name: 'compiler_explainability', role: 'explainability' },
                { name: 'drift_assessment', role: 'governance' }
              ],
              reason: '2/4 connected systems already surface the propagation pattern; missing=compiler_explainability, drift_assessment.',
              nextAction: 'Update compiler_explainability, drift_assessment to surface the propagation pattern.'
            }
          }
        }
      },
      systemInventory: {
        ...buildFixture().systemInventory,
        inventoryState: 'watching',
        policyCoverage: {
          coverageState: 'stale',
          coverageScore: 40,
          summaryText: 'coverage=stale | score=40',
          nextAction: 'Resolve policy drift before trusting propagation.'
        },
        summary: {
          ...buildFixture().systemInventory.summary,
          inventoryState: 'watching',
          policyDriftCount: 12,
          missingCanonicalApiCount: 1,
          missingCanonicalSurfaceCount: 1,
          metadataCoveragePct: 84
        }
      },
      metricsSnapshot: {
        current: {
          behaviorState: 'blocked',
          mvpReady: false,
          summaryText: 'metrics blocked',
          readinessReason: 'Propagation blockers detected.'
        },
        summary: 'metrics blocked'
      },
      healthDashboard: {
        status: 'blocked',
        summary: 'dashboard blocked'
      },
      healthPanel: {
        status: 'blocked',
        summary: 'panel blocked'
      },
      observability: {
        state: 'blocked',
        trustworthy: false,
        summary: 'observability=blocked',
        signals: [
          {
            key: 'policy',
            state: 'stale',
            healthy: false,
            trustworthy: false,
            reason: 'Policy coverage is stale.',
            recommendation: 'Resolve policy drift before trusting propagation.',
            sourceOfTruth: 'policy coverage'
          },
          {
            key: 'propagation',
            state: 'stale',
            healthy: false,
            trustworthy: false,
            reason: 'Propagation expansion is missing in some consumers.',
            recommendation: 'Attach propagation where missing.',
            sourceOfTruth: 'compiler drift assessment'
          }
        ]
      }
    }));
    const summary = summarizeCompilerControlPlane(controlPlane);

    expect(controlPlane.state).toBe('blocked');
    expect(controlPlane.metricAlignment.state).toBe('drifting');
    expect(controlPlane.telemetry.requiredMissingCount).toBeGreaterThan(0);
    expect(controlPlane.propagation.missingSystemCount).toBe(2);
    expect(controlPlane.gaps.some((gap) => gap.key === 'metric_alignment')).toBe(true);
    expect(controlPlane.gaps.some((gap) => gap.key === 'policy_drift')).toBe(true);
    expect(controlPlane.gaps.some((gap) => gap.key === 'propagation_adoption')).toBe(true);
    expect(summary.topGaps[0].severity).toBe('critical');
    expect(summary.propagation.missingSystemNames).toContain('compiler_explainability');
  });
});
