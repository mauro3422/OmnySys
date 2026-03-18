/**
 * @fileoverview shared-stats.js
 * 
 * Shared statistics proxy for the Error Guardian subsystem.
 * 
 * @module core/error-guardian/utils/shared-stats
 */
import { statsPool } from '../../../shared/utils/stats-pool.js';

export const getGuardianStats = (namespace, ...args) => {
  return statsPool.getStats(namespace, ...args);
};
