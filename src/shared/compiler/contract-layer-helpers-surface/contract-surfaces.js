/**
 * Contract and semantic surface builders for contract layer.
 * Builds surfaces for data_gateway_contract, semantic_connections.
 */

import { normalizeCount } from '../surface-utils.js';
import { buildSurface } from './models.js';

export function buildContractAndSemanticSurfaces({
  semanticCanonicality = null,
  semanticSurfaceGranularity = null,
  dataGatewayContract = null
} = {}) {
  const semanticSummaryCount = normalizeCount(semanticSurfaceGranularity?.fileLevel?.total);
  const semanticDetailCount = normalizeCount(semanticSurfaceGranularity?.atomLevel?.total);

  return [
    buildSurface({
      id: 'semantic_connections',
      kind: 'table',
      status: semanticCanonicality?.status === 'drift' ? 'drifting_summary' : 'advisory_only',
      sourceOfTruth: false,
      scope: 'file-level semantic summary',
      surface: 'semantic_connections',
      backingSurface: 'atoms.semantic_metadata',
      trustworthy: semanticCanonicality?.trustworthy !== false,
      healthy: semanticSurfaceGranularity?.materiallyDrifting !== true,
      summary: semanticCanonicality?.summary || `Advisory semantic summary with ${semanticSummaryCount} rows.`,
      evidence: {
        fileLevelTotal: semanticSummaryCount,
        canonicalFileLevelTotal: normalizeCount(semanticSurfaceGranularity?.canonicalAdapterView?.total),
        atomLevelTotal: semanticDetailCount
      }
    }),
    buildSurface({
      id: 'data_gateway_contract',
      kind: 'contract',
      status: dataGatewayContract?.summary?.trustworthy === true
        ? 'canonical'
        : (dataGatewayContract?.summary?.primaryIssue?.state || 'watching'),
      sourceOfTruth: true,
      scope: 'canonical data gateway freshness and coverage gate',
      surface: 'data_gateway_contract',
      backingSurface: 'atoms + files + atom_relations',
      trustworthy: dataGatewayContract?.summary?.trustworthy !== false,
      healthy: dataGatewayContract?.summary?.trustworthy !== false,
      summary: dataGatewayContract?.summary?.nextAction
        || 'Canonical data gateway contract governs freshness, coverage and drift.',
      evidence: {
        state: dataGatewayContract?.summary?.state || null,
        fresh: dataGatewayContract?.summary?.fresh || 0,
        partial: dataGatewayContract?.summary?.partial || 0,
        stale: dataGatewayContract?.summary?.stale || 0,
        missing: dataGatewayContract?.summary?.missing || 0,
        blocked: dataGatewayContract?.summary?.blocked || 0
      }
    })
  ];
}
