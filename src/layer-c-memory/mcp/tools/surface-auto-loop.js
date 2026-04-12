/**
 * @fileoverview surface-auto-loop MCP tool
 *
 * Creates canonical surface files for tables that have data but no read API.
 * Supports dry-run mode for preview before applying.
 *
 * Usage: Call with { dryRun: true } to preview, then { dryRun: false } to apply.
 *
 * @module layer-c-memory/mcp/tools/surface-auto-loop
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { buildSurfaceObligationsPropagationPlan } from '#shared/compiler/surface-obligations-propagator.js';
import {
  executeSurfaceAutoLoop,
  executeBatchSurfaceAutoLoop,
  formatAutoLoopReport
} from '#shared/compiler/surface-auto-loop.js';

/**
 * MCP Tool: surface-auto-loop
 *
 * @param {object} params
 * @param {string} [params.projectPath] - Project path (default: current project)
 * @param {string} [params.tableName] - Specific table to create surface for (optional)
 * @param {boolean} [params.dryRun=true] - Preview only, don't write files
 * @returns {Promise<object>} Result of the auto-loop
 */
export async function surfaceAutoLoopTool(params = {}) {
  const { projectPath, tableName, dryRun = true } = params;

  try {
    const repo = getRepository(projectPath);
    if (!repo?.db) {
      return {
        success: false,
        error: 'Database not available',
        recommendation: 'Ensure the project has been indexed first.'
      };
    }

    const db = repo.db;
    const rootPath = repo.projectPath || projectPath || process.cwd();

    // Get all surface obligations
    const plan = buildSurfaceObligationsPropagationPlan(db);

    if (plan.totalObligations === 0) {
      return {
        success: true,
        message: 'No missing surfaces detected. All tables have canonical surfaces.',
        surfaceCount: Object.keys(CANONICAL_SURFACE_REGISTRY || {}).length
      };
    }

    // Filter to specific table if requested
    let obligations = plan.obligations;
    if (tableName) {
      obligations = obligations.filter(o => o.sourceTable === tableName);
      if (obligations.length === 0) {
        return {
          success: false,
          error: `No missing surface found for table '${tableName}'`,
          availableTables: plan.obligations.map(o => o.sourceTable)
        };
      }
    }

    // Execute auto-loop
    const filteredPlan = { ...plan, obligations };
    const result = await executeBatchSurfaceAutoLoop(filteredPlan, db, rootPath, { dryRun });

    return {
      success: true,
      mode: dryRun ? 'dry-run' : 'apply',
      report: formatAutoLoopReport(result),
      ...result
    };

  } catch (err) {
    return {
      success: false,
      error: err.message,
      stack: err.stack
    };
  }
}

// Import needed for the success check
import { CANONICAL_SURFACE_REGISTRY } from '#shared/compiler/index.js';

export default surfaceAutoLoopTool;
