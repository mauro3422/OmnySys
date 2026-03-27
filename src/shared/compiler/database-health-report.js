/**
 * @fileoverview Final payload assembly for canonical database health.
 *
 * This keeps the scoring helper and the public summary separate so the status
 * surface can stay small enough for governance and editing safety.
 *
 * @module shared/compiler/database-health-report
 */

export {
  buildDatabaseHealthMetrics
} from './database-health-report-metrics.js';

export {
  buildDatabaseHealthReport
} from './database-health-report-assembly.js';
