/**
 * @fileoverview Scheduled Job Detector
 *
 * Detects scheduled jobs and tasks.
 *
 * @module module-system/detectors/job-detector
 * @phase 3
 */

import path from 'path';
import { getAllAtoms } from '../utils.js';

const JOB_NAME_PATTERN = /^(schedule|cron|job|task)/i;

/**
 * Search scheduled jobs in project modules.
 * @param {Array} modules - Project modules
 * @returns {Array} - Found jobs
 */
export function findScheduledJobs(modules) {
  return (modules || []).flatMap(module =>
    (getAllAtoms(module) || [])
      .filter(atom => atom?.name && JOB_NAME_PATTERN.test(atom.name))
      .map(atom => buildScheduledJob(module, atom))
  );
}

function buildScheduledJob(module, atom) {
  return {
    type: 'scheduled',
    name: atom.name,
    schedule: 'unknown',
    handler: {
      module: module.moduleName,
      file: atom.filePath ? path.basename(atom.filePath) : 'unknown',
      function: atom.name
    }
  };
}
