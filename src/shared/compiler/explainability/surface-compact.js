import { summarizeSurfaceAuditForStatus } from '../surface-audit/summary.js';

export function compactSurfaceAudit(surfaceAudit = null) {
  return surfaceAudit ? summarizeSurfaceAuditForStatus(surfaceAudit) : null;
}
