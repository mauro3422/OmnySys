/**
 * Canonical control-plane table for get_server_status.
 */

import { buildStatusTableRows } from './status-system-table-rows.js';
import { renderSystemTableAscii } from './status-system-table/context.js';

export function buildSystemTableSummary(status = {}) {
  if (!status || typeof status !== 'object') {
    return null;
  }

  const rows = buildStatusTableRows(status);
  return {
    title: 'Control Plane',
    rows,
    ascii: renderSystemTableAscii({ rows })
  };
}

export { renderSystemTableAscii };

export default {
  buildSystemTableSummary,
  renderSystemTableAscii
};
