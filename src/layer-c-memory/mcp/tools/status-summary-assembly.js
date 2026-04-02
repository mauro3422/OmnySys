/**
 * Final status summary assembly.
 */

import { buildStatusSummaryPayload } from './status-summary-payload.js';

export function summarizeStatus(status, recentErrors) {
  return buildStatusSummaryPayload(status, recentErrors);
}
