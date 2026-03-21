/**
 * @fileoverview Scheduled Job Detector
 *
 * Detects scheduled jobs and tasks.
 *
 * @module module-system/detectors/job-detector
 * @phase 3
 */

import { buildHandlerContext, scanModuleAtoms } from './detector-helpers.js';

const JOB_NAME_PATTERN = /^(schedule|cron|job|task)/i;

/**
 * Search scheduled jobs in project modules.
 * @param {Array} modules - Project modules
 * @returns {Array} - Found jobs
 */
export function findScheduledJobs(modules) {
  return scanModuleAtoms(
    modules,
    atom => atom?.name && JOB_NAME_PATTERN.test(atom.name),
    buildScheduledJob
  );
}

function buildScheduledJob(module, atom) {
  return {
    type: 'scheduled',
    name: atom.name,
    schedule: 'unknown',
    handler: buildHandlerContext(module, atom)
  };
}
