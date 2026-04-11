import { createLogger } from '../../../utils/logger.js';
import {
  buildTrustInvestigationReport,
  summarizeTrustInvestigationReport
} from '#shared/compiler/index.js';

const logger = createLogger('OmnySys:trust-investigation');

export async function get_trust_investigation_report(args, context) {
  logger.info('[Tool] get_trust_investigation_report()');

  try {
    const result = await buildTrustInvestigationReport(context?.projectPath || null, {
      context,
      scopePath: args?.scopePath || null,
      focusPath: args?.focusPath || null,
      compareDays: args?.compareDays || 3,
      historyLimit: args?.historyLimit || 12,
      toolRunTelemetryWindowDays: args?.toolRunTelemetryWindowDays || 7,
      limit: args?.limit || 3,
      persist: args?.persist !== false,
      includeSamples: args?.includeSamples !== false
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Project repository unavailable'
      };
    }

    return {
      success: true,
      aggregationType: 'trust_investigation_report',
      report: result,
      summary: summarizeTrustInvestigationReport(result),
      snapshot: result.snapshot,
      trust: result.trust,
      gates: result.gates,
      samples: result.samples,
      database: result.database,
      metadata: result.metadata,
      inventory: result.inventory,
      issues: result.issues,
      sessions: result.sessions,
      tools: result.tools,
      priorityActions: result.priorityActions
    };
  } catch (error) {
    logger.error(`[Tool] get_trust_investigation_report failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_trust_investigation_report };
