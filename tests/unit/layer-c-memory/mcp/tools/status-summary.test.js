import { describe, expect, it } from 'vitest';

import { summarizeCompilerExplainability as compactCompilerExplainabilitySummary } from '../../../../../src/shared/compiler/explainability/summary.js';

describe('status summary explainability', () => {
  it('retains surface audit in the compact explainability payload', () => {
    const summary = compactCompilerExplainabilitySummary({
      compilerContractLayer: {
        summary: {
          healthy: true,
          failedInvariantCount: 0,
          canonicalWrapperFindings: 0,
          canonicalBypassFindings: 0,
          parallelCanonicalSurfaceFindings: 0,
          dataGatewayContractTrustworthy: true,
          dataGatewayContractState: 'fresh',
          nextAction: 'ok'
        }
      },
      standardization: {
        canonicalFamilies: [],
        stableCanonicalFamilies: [],
        summary: {}
      },
      surfaceAudit: {
        generation: {
          generationId: 'analysis:status:abc',
          status: 'fresh',
          healthy: true,
          recommendation: 'ok'
        },
        summary: {
          total: 2,
          fresh: 1,
          partial: 1,
          stale: 0,
          missing: 0,
          blocked: 0,
          trustworthy: true,
          nextAction: 'ok',
          primaryIssue: null
        },
        metrics: {
          activeAtoms: 1,
          activeFiles: 1,
          activeCallRelations: 0,
          activeSemanticConnections: 1,
          orphanCallRelations: 0,
          activeSystemFiles: 1,
          systemFilesWithSemantics: 1,
          metadataTables: 3,
          metadataRows: 10,
          metadataFields: 20,
          metadataCoveragePct: 50,
          metadataFieldCoveragePct: 60
        },
        surfaces: [
          {
            key: 'metadata_extraction_coverage',
            label: 'Metadata extraction coverage',
            state: 'partial',
            healthy: true,
            trustworthy: true,
            sourceOfTruth: 'atoms',
            reason: 'ok',
            counts: {}
          }
        ],
        metadataExtractionCoverage: {
          summary: {
            totalTables: 3,
            totalRows: 10,
            totalFields: 20,
            coveredFields: 10,
            emptyFields: 10,
            partialFields: 2,
            coveragePct: 50,
            fieldCoveragePct: 60,
            nextAction: 'ok'
          },
          primaryIssue: {
            table: 'atoms',
            field: 'called_by_json',
            state: 'empty'
          },
          topMissingFields: [
            { table: 'atoms', field: 'called_by_json' }
          ],
          topCoveredFields: [
            { table: 'files', field: 'hash' }
          ]
        }
      },
      driftAssessment: {
        status: 'stable',
        healthy: true,
        trustworthy: true,
        summary: {
          total: 2,
          fresh: 2,
          partial: 0,
          stale: 0,
          missing: 0,
          blocked: 0,
          nextAction: 'ok',
          primaryIssue: null
        },
        recommendations: ['ok'],
        signals: [
          {
            key: 'policy_drift',
            label: 'Policy drift',
            state: 'fresh',
            severity: 'low',
            reason: 'ok',
            sourceOfTruth: 'policy conformance scan'
          }
        ]
      }
    });

    expect(summary.surfaceAudit).toMatchObject({
      generation: {
        generationId: 'analysis:status:abc',
        status: 'fresh',
        healthy: true
      },
      summary: {
        total: 2,
        fresh: 1,
        partial: 1,
        trustworthy: true
      },
      metadataExtractionCoverage: {
        totalTables: 3,
        totalRows: 10,
        totalFields: 20,
        coveredFields: 10,
        coveragePct: 50,
        fieldCoveragePct: 60
      }
    });

    expect(summary.driftAssessment).toMatchObject({
      status: 'stable',
      healthy: true,
      trustworthy: true,
      total: 2,
      fresh: 2,
      partial: 0,
      stale: 0,
      missing: 0,
      blocked: 0,
      nextAction: 'ok',
      primaryIssue: null,
      recommendations: ['ok']
    });
  });
});
