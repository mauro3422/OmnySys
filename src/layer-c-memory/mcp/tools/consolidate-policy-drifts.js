/**
 * @fileoverview MCP Tool: consolidate_policy_drifts
 *
 * Detecta policy drifts y genera/aplica planes de reparación.
 * Similar a folderize_family pero para conformance de contratos canónicos.
 *
 * @module layer-c-memory/mcp/tools/consolidate-policy-drifts
 */

import { createLogger } from '../../utils/logger.js';
import { consolidatePolicyDrifts } from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:mcp:consolidate_policy_drifts');

export async function consolidate_policy_drifts(args, context) {
  const {
    filePaths = [],
    scopePath = null,
    policyArea = null,
    execute = false
  } = args;

  try {
    const result = await consolidatePolicyDrifts({
      filePaths,
      scopePath,
      policyArea,
      execute
    });

    return {
      success: true,
      mode: result.mode,
      summary: result.summary,
      findings: result.findings,
      repairPlans: result.repairPlans,
      executionResults: result.executionResults
    };
  } catch (error) {
    logger.error(`[Tool] consolidate_policy_drifts failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { consolidate_policy_drifts };
