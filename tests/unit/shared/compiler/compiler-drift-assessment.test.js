import { describe, expect, it } from 'vitest';

import {
  buildCompilerDriftAssessment,
  summarizeCompilerDriftAssessment
} from '../../../../src/shared/compiler/compiler-drift-assessment.js';

describe('compiler drift assessment', () => {
  it('stays stable when the canonical surfaces are aligned', () => {
    const assessment = buildCompilerDriftAssessment({
      analysisGeneration: {
        drift: { status: 'stable', recommendation: 'ok' },
        counts: { files: 1, atoms: 1, relations: 1, semanticConnections: 1, derivedFeatures: 1 }
      },
      policySummary: { total: 0, high: 0, medium: 0, byPolicyArea: {} },
      metadataSurfaceParity: { healthy: true, trustworthy: true, summary: 'parity' },
      metadataExtractionCoverage: {
        summary: {
          healthy: true,
          trustworthy: true,
          nextAction: 'ok',
          totalTables: 1,
          totalRows: 1,
          totalFields: 1,
          coveredFields: 1,
          emptyFields: 0,
          partialFields: 0,
          coveragePct: 100,
          fieldCoveragePct: 100
        }
      },
      dataGatewayContract: {
        summary: {
          total: 1,
          fresh: 1,
          partial: 0,
          stale: 0,
          missing: 0,
          blocked: 0,
          trustworthy: true,
          nextAction: 'ok',
          primaryIssue: null
        }
      },
      databaseHealth: {
        healthy: true,
        healthScore: 95,
        summary: 'db healthy',
        criticalFindings: [],
        warnings: [],
        recommendations: [],
        metrics: {}
      },
      liveRowSync: {
        summary: {
          staleAtomRows: 0,
          staleFileRows: 0,
          staleRiskRows: 0,
          staleRelationRows: 0,
          staleConnectionRows: 0
        },
        phase2PendingFiles: 0,
        synchronized: true,
        hadDrift: false
      },
      systemMapPersistenceCoverage: {
        healthy: true,
        summary: 'ok',
        filesTotal: 1,
        activeFiles: 1,
        systemFilesTotal: 1,
        fileDependenciesTotal: 1
      },
      semanticSurfaceGranularity: {
        healthy: true,
        summary: 'ok',
        materiallyDrifting: false
      },
      fileUniverseGranularity: {
        healthy: true,
        contract: { trustworthy: true },
        scannedFileTotal: 1,
        manifestFileTotal: 1,
        liveFileCount: 1,
        zeroAtomFileCount: 0
      }
    });

    expect(assessment.status).toBe('stable');
    expect(assessment.healthy).toBe(true);
    expect(assessment.summary.trustworthy).toBe(true);
    expect(assessment.issues).toHaveLength(0);
    expect(summarizeCompilerDriftAssessment(assessment)).toMatchObject({
      status: 'stable',
      healthy: true,
      trustworthy: true,
      total: 11,
      fresh: 11,
      partial: 0,
      stale: 0,
      missing: 0,
      blocked: 0
    });
  });

  it('flags propagation expansion drift when watcher or tool surfaces omit the canonical plan', () => {
    const assessment = buildCompilerDriftAssessment({
      analysisGeneration: {
        drift: { status: 'stable', recommendation: 'ok' },
        counts: { files: 1, atoms: 1, relations: 1, semanticConnections: 1, derivedFeatures: 1 }
      },
      policySummary: {
        total: 1,
        high: 0,
        medium: 1,
        byPolicyArea: { propagation_expansion: 1 }
      },
      metadataSurfaceParity: { healthy: true, trustworthy: true, summary: 'parity' },
      metadataExtractionCoverage: {
        summary: {
          healthy: true,
          trustworthy: true,
          nextAction: 'ok',
          totalTables: 1,
          totalRows: 1,
          totalFields: 1,
          coveredFields: 1,
          emptyFields: 0,
          partialFields: 0,
          coveragePct: 100,
          fieldCoveragePct: 100
        }
      },
      dataGatewayContract: {
        summary: {
          total: 1,
          fresh: 1,
          partial: 0,
          stale: 0,
          missing: 0,
          blocked: 0,
          trustworthy: true,
          nextAction: 'ok',
          primaryIssue: null
        }
      },
      databaseHealth: {
        healthy: true,
        healthScore: 95,
        summary: 'db healthy',
        criticalFindings: [],
        warnings: [],
        recommendations: [],
        metrics: {}
      },
      liveRowSync: {
        summary: {
          staleAtomRows: 0,
          staleFileRows: 0,
          staleRiskRows: 0,
          staleRelationRows: 0,
          staleConnectionRows: 0
        },
        phase2PendingFiles: 0,
        synchronized: true,
        hadDrift: false
      },
      systemMapPersistenceCoverage: {
        healthy: true,
        summary: 'ok',
        filesTotal: 1,
        activeFiles: 1,
        systemFilesTotal: 1,
        fileDependenciesTotal: 1
      },
      semanticSurfaceGranularity: {
        healthy: true,
        summary: 'ok',
        materiallyDrifting: false
      },
      fileUniverseGranularity: {
        healthy: true,
        contract: { trustworthy: true },
        scannedFileTotal: 1,
        manifestFileTotal: 1,
        liveFileCount: 1,
        zeroAtomFileCount: 0
      }
    });

    expect(assessment.status).toBe('drifting');
    expect(assessment.healthy).toBe(false);
    expect(assessment.summary.primaryIssue.key).toBe('propagation_expansion');
    expect(assessment.issues[0].key).toBe('propagation_expansion');
    expect(summarizeCompilerDriftAssessment(assessment)).toMatchObject({
      status: 'drifting',
      healthy: false,
      trustworthy: false,
      total: 11,
      fresh: 9,
      partial: 0,
      stale: 2,
      missing: 0,
      blocked: 0
    });
  });

  it('blocks on canonical data-gateway bypasses', () => {
    const assessment = buildCompilerDriftAssessment({
      policySummary: {
        total: 1,
        high: 1,
        medium: 0,
        byPolicyArea: { data_gateway: 1 }
      },
      dataGatewayContract: {
        summary: {
          total: 1,
          fresh: 0,
          partial: 0,
          stale: 1,
          missing: 0,
          blocked: 0,
          trustworthy: false,
          nextAction: 'repair',
          primaryIssue: { key: 'data_gateway_contract', state: 'stale', reason: 'repair' }
        }
      }
    });

    expect(assessment.status).toBe('blocked');
    expect(assessment.healthy).toBe(false);
    expect(assessment.summary.primaryIssue.key).toBe('policy_drift');
    expect(assessment.issues[0].key).toBe('policy_drift');
    expect(summarizeCompilerDriftAssessment(assessment)).toMatchObject({
      status: 'blocked',
      healthy: false,
      trustworthy: false,
      blocked: 1
    });
    expect(summarizeCompilerDriftAssessment(assessment).missing).toBeGreaterThan(0);
  });
});
