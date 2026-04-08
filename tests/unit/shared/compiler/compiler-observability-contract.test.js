import { describe, expect, it } from 'vitest';

import {
  buildCompilerObservabilityContract,
  summarizeCompilerObservabilityContract
} from '../../../../src/shared/compiler/compiler-observability-contract.js';

function buildBaseFixture() {
  return {
    compilerExplainability: {
      policyCoverage: {
        state: 'fresh',
        coverageState: 'fresh',
        coverageScore: 100,
        policyDriftCount: 0,
        nextAction: 'Keep routing propagation through the canonical shared helpers.'
      },
      systemInventory: {
        summary: {
          inventoryState: 'watching',
          policyCoverageState: 'fresh',
          policyCoverageScore: 100,
          policyCoverageRatio: 1,
          policyDriftCount: 0,
          missingCanonicalApiCount: 0,
          missingCanonicalSurfaceCount: 0,
          standardizationGapCount: 0,
          integrationCoveragePct: 100,
          metadataCoveragePct: 84,
          historyStoreState: 'ready',
          historyStoreCount: 2,
          nextAction: 'No missing canonical family detected right now; focus on adopting the existing ones consistently.'
        },
        policyCoverage: {
          state: 'fresh',
          coverageState: 'fresh',
          coverageScore: 100,
          policyDriftCount: 0,
          nextAction: 'Keep routing propagation through the canonical shared helpers.'
        }
      },
      dataGatewayContract: {
        summary: {
          trustworthy: true,
          nextAction: 'Route freshness, coverage and drift checks through the canonical data gateway contract.'
        }
      },
      driftAssessment: {
        status: 'stable',
        healthy: true,
        trustworthy: true,
        summary: {
          total: 0,
          fresh: 12,
          partial: 0,
          stale: 0,
          missing: 0,
          blocked: 0,
          nextAction: 'All tracked drift surfaces are fresh enough to trust downstream reads.',
          primaryIssue: null
        },
        signals: [
          {
            key: 'propagation_expansion',
            state: 'fresh',
            healthy: true,
            trustworthy: true,
            reason: 'No propagation expansion drift detected.',
            recommendation: 'Keep watcher and tool surfaces attached to the canonical propagation engine.',
            sourceOfTruth: 'compiler drift assessment'
          },
          {
            key: 'metric_coherence',
            state: 'fresh',
            healthy: true,
            trustworthy: true,
            reason: 'Metric surfaces are coherent.',
            recommendation: 'Keep all reporting surfaces aligned to the same compilerExplainability instance.',
            sourceOfTruth: 'cross-surface metric validation'
          }
        ]
      }
    },
    systemInventory: {
      summary: {
        inventoryState: 'watching',
        policyCoverageState: 'fresh',
        policyCoverageScore: 100,
        policyCoverageRatio: 1,
        policyDriftCount: 0,
        missingCanonicalApiCount: 0,
        missingCanonicalSurfaceCount: 0,
        standardizationGapCount: 0,
        integrationCoveragePct: 100,
        metadataCoveragePct: 84,
        historyStoreState: 'ready',
        historyStoreCount: 2,
        nextAction: 'No missing canonical family detected right now; focus on adopting the existing ones consistently.'
      }
    },
    canonicalPromotion: {
      promotionState: 'watching',
      inventoryState: 'watching',
      folderizationState: 'fresh',
      folderizationDecision: 'review',
      candidateCount: 0,
      folderizedFamilyCount: 0,
      emergentCandidateCount: 0,
      canonicalCandidateCount: 0,
      nextAction: 'No canonical promotion is needed right now.'
    },
    metricsSnapshot: {
      current: {
        globalHealthScore: 100,
        globalHealthGrade: 'A+',
        healthScore: 100,
        healthGrade: 'A+',
        reliabilityScore: 94,
        reliabilityGrade: 'A',
        successScore: 95,
        successThreshold: 90,
        mvpReady: true,
        behaviorState: 'watchful',
        readinessReason: 'The control plane is ready.',
        driftState: 'stable',
        driftScore: 100,
        stabilityScore: 100,
        activeAtomsDriftState: 'fresh',
        activeAtomsDriftReason: 'Active atom counts remain aligned with the previous snapshot.',
        summaryText: 'Health 100/A+ | db=100/A+ | trust=94/A | trend=stable:0/day'
      },
      summary: 'Health 100/A+ | db=100/A+ | trust=94/A | trend=stable:0/day'
    },
    healthDashboard: {
      status: 'ready',
      health: {
        globalHealthScore: 100,
        globalHealthGrade: 'A+',
        healthScore: 100,
        healthGrade: 'A+',
        reliabilityScore: 94,
        reliabilityGrade: 'A',
        successScore: 95,
        successThreshold: 90,
        mvpReady: true,
        behaviorState: 'watchful',
        readinessReason: 'The control plane is ready.',
        driftState: 'stable'
      },
      trend: {
        status: 'stable',
        summary: 'Trend is stable.'
      },
      summary: 'Health 100/A+ | db=100/A+ | trust=94/A | trend=stable:0/day'
    },
    healthPanel: {
      status: 'ready',
      headline: 'A+ 100/90 ready',
      now: {
        globalHealthScore: 100,
        globalHealthGrade: 'A+',
        healthScore: 100,
        healthGrade: 'A+',
        reliabilityScore: 94,
        reliabilityGrade: 'A',
        successScore: 95,
        successThreshold: 90,
        mvpReady: true,
        behaviorState: 'watchful',
        readinessReason: 'The control plane is ready.',
        driftState: 'stable'
      },
      trend: {
        status: 'stable',
        summary: 'Trend is stable.'
      },
      summary: 'Health panel stable.'
    },
    startupTelemetry: {
      state: 'fresh',
      totalDurationMs: 3700,
      layerAStrategy: 'load_only',
      summary: 'fresh | startup=3700ms | layerA=load_only:0ms | budget=within-budget',
      recommendation: 'Keep tracking the startup baseline for regressions.'
    },
    proxyRuntimeTelemetry: {
      state: 'stable',
      riskLevel: 'low',
      summary: 'stable | risk=low | connects=1 | reconnects=0 | closed=0 | expired=0 | retryable=0 | stdioClose=0',
      recommendation: 'Keep proxy restart telemetry persisted so regressions are visible in status.'
    },
    bridgeRuntimeTelemetry: {
      state: 'stable',
      healthState: 'stable',
      riskLevel: 'low',
      summary: 'stable | risk=low | connects=1 | reconnects=0 | closed=0 | expired=0 | retryable=0 | stdioClose=0',
      recommendation: 'Keep bridge runtime telemetry persisted so client disconnects are visible in status.'
    }
  };
}

describe('compiler-observability-contract', () => {
  it('builds a ready observability contract when core signals are healthy', () => {
    const observability = buildCompilerObservabilityContract(buildBaseFixture());

    expect(observability.state).toBe('ready');
    expect(observability.ready).toBe(true);
    expect(observability.healthy).toBe(true);
    expect(observability.policyState).toBe('fresh');
    expect(observability.propagationState).toBe('fresh');
    expect(observability.gatewayState).toBe('fresh');
    expect(observability.readinessState).toBe('ready');
    expect(observability.telemetryState).toBe('ready');
    expect(observability.metricsState).toBe('fresh');
    expect(observability.actionRequired).toBe(false);
    expect(observability.counts.blocked).toBe(0);
    expect(observability.summary).toContain('policy=fresh');
    expect(observability.signals.some((signal) => signal.key === 'propagation' && signal.state === 'fresh')).toBe(true);

    const compact = summarizeCompilerObservabilityContract(observability);
    expect(compact.state).toBe('ready');
    expect(compact.ready).toBe(true);
    expect(compact.signals[0]).toHaveProperty('key');
  });

  it('reports settling when readiness is waiting for the bootstrap baseline', () => {
    const fixture = buildBaseFixture();
    fixture.healthDashboard.trend.status = 'settling';
    fixture.healthDashboard.trend.summary = 'Bootstrap trend is still settling.';
    fixture.healthPanel.trend.status = 'settling';
    fixture.healthPanel.trend.summary = 'Bootstrap trend is still settling.';
    fixture.healthPanel.now.mvpReady = false;
    fixture.healthPanel.now.behaviorState = 'blocked';
    fixture.healthPanel.now.readinessReason = 'Bootstrap trend is still settling.';
    fixture.metricsSnapshot.current.mvpReady = false;
    fixture.metricsSnapshot.current.behaviorState = 'blocked';
    fixture.metricsSnapshot.current.readinessReason = 'Bootstrap trend is still settling.';

    const observability = buildCompilerObservabilityContract(fixture);

    expect(observability.state).toBe('settling');
    expect(observability.readinessState).toBe('settling');
    expect(observability.ready).toBe(false);
    expect(observability.actionRequired).toBe(true);
    expect(observability.reason).toContain('settling');
    expect(observability.nextAction).toContain('baseline');
  });

  it('reports drifting when propagation expansion is stale', () => {
    const fixture = buildBaseFixture();
    fixture.compilerExplainability.driftAssessment.signals[0] = {
      key: 'propagation_expansion',
      state: 'stale',
      healthy: false,
      trustworthy: false,
      reason: '1 propagation_expansion policy finding(s) indicate watcher or tool surfaces are not surfacing propagation where expected.',
      recommendation: 'Attach the canonical propagation plan or consume it from shared/compiler before emitting watcher, status or reporting payloads.',
      sourceOfTruth: 'compiler drift assessment'
    };

    const observability = buildCompilerObservabilityContract(fixture);

    expect(observability.state).toBe('drifting');
    expect(observability.propagationState).toBe('stale');
    expect(observability.actionRequired).toBe(true);
    expect(observability.reason).toContain('propagation');
    expect(observability.nextAction).toContain('canonical propagation plan');
  });

  it('reports blocked when bridge telemetry thrashes', () => {
    const fixture = buildBaseFixture();
    fixture.bridgeRuntimeTelemetry = {
      state: 'thrashing',
      healthState: 'blocked',
      riskLevel: 'critical',
      summary: 'thrashing | risk=critical | connects=6 | reconnects=4 | closed=3 | expired=2 | retryable=3 | stdioClose=5',
      recommendation: 'Inspect bridge recovery and session reuse before trusting the client UI.'
    };

    const observability = buildCompilerObservabilityContract(fixture);

    expect(observability.state).toBe('blocked');
    expect(observability.telemetryState).toBe('blocked');
    expect(observability.ready).toBe(false);
    expect(observability.actionRequired).toBe(true);
    expect(observability.reason).toContain('telemetry');
    expect(observability.nextAction).toContain('bridge runtime telemetry');
  });
});
