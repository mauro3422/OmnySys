/**
 * Tool: mcp_omnysystem_get_health_panel
 *
 * Returns a compact one-screen health panel derived from the canonical
 * compiler metrics snapshot.
 */

import { createLogger } from '../../../utils/logger.js';
import { buildCompilerSnapshotContext } from './compiler-snapshot-service/index.js';

const logger = createLogger('OmnySys:health-panel');

export async function get_health_panel(args, context) {
  logger.info('[Tool] get_health_panel()');

  try {
    const result = await buildCompilerSnapshotContext(args, context, {
      captureSource: 'mcp.tool.get_health_panel',
      snapshotKind: args?.snapshotKind || 'dashboard'
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Project repository unavailable'
      };
    }

    return {
      success: true,
      aggregationType: 'health_panel',
      panel: result.healthPanel,
      observability: result.observability || null,
      controlPlane: result.controlPlaneSummary || result.controlPlane || null,
      status: {
        healthScore: result.healthPanel?.now?.healthScore || 0,
        healthGrade: result.healthPanel?.now?.healthGrade || 'F',
        successScore: result.healthPanel?.now?.successScore || 0,
        mvpReady: result.healthPanel?.now?.mvpReady === true,
        behaviorState: result.healthPanel?.now?.behaviorState || null,
        trend: result.healthPanel?.trend || null,
        topRegressors: result.healthPanel?.topRegressors || [],
        topImprovements: result.healthPanel?.topImprovements || [],
        nextAction: result.healthPanel?.nextAction || null
      },
      summary: result.healthPanel?.summary || result.snapshot.summary,
      oneLine: result.healthPanel?.oneLine || null
    };
  } catch (error) {
    logger.error(`[Tool] get_health_panel failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_health_panel };
