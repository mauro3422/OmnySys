import { describe, expect, it } from 'vitest';

import { compactCompilerExplainabilitySummary } from '../../../../../src/layer-c-memory/mcp/tools/status-summary.js';

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
  });
});
