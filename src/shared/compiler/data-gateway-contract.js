/**
 * @fileoverview Canonical data-gateway contract for compiler surfaces.
 *
 * Centralizes freshness/trust evaluation for the DB-backed surfaces that feed
 * the compiler, status tools and repair paths. This is a policy layer, not a
 * new data source.
 *
 * @module shared/compiler/data-gateway-contract
 */

import { buildSurfaceFreshnessLedger, summarizeSurfaceFreshnessLedger } from './data-gateway-contract-summary.js';

export {
  buildSurfaceFreshnessLedger,
  summarizeSurfaceFreshnessLedger
} from './data-gateway-contract-summary.js';

export function buildDataGatewayContract(options = {}) {
  return buildSurfaceFreshnessLedger(options);
}

export function summarizeDataGatewayContract(contract = null) {
  if (!contract || typeof contract !== 'object') {
    return {
      total: 0,
      fresh: 0,
      partial: 0,
      stale: 0,
      missing: 0,
      blocked: 0,
      trustworthy: false,
      nextAction: 'No data-gateway contract is available.'
    };
  }

  return summarizeSurfaceFreshnessLedger(contract);
}

export default {
  buildSurfaceFreshnessLedger,
  summarizeSurfaceFreshnessLedger,
  buildDataGatewayContract,
  summarizeDataGatewayContract
};
