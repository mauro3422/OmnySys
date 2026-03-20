/**
 * @fileoverview WorkerDetector.js
 *
 * Detects broken Web Workers.
 *
 * @module analyses/tier3/detectors/WorkerDetector
 */

import { groupByFile } from '../utils/issue-utils.js';
import { normalizePath } from '../../../../shared/utils/path-utils.js';

const PATH_SEPARATORS_REGEX = /[\\/]+/g;
const RELATIVE_PREFIX_REGEX = /^(\.\/|\.\.\/)+/;

function normalizeLookupPath(value) {
  return normalizePath(String(value || '')).replace(PATH_SEPARATORS_REGEX, '/').toLowerCase();
}

function stripRelativePrefix(value) {
  return normalizeLookupPath(value).replace(RELATIVE_PREFIX_REGEX, '');
}

function buildProjectFileIndex(systemMap) {
  const files = Object.keys((systemMap || {}).files || {});
  const projectFileIndex = [];

  for (const fullPath of files) {
    const fileName = fullPath.replace(/^.*[\\\/]/, '');
    const withoutExt = fileName.replace(/\.[^.]+$/, '');

    projectFileIndex.push({
      fullPath,
      normalizedFullPath: normalizeLookupPath(fullPath),
      fileName,
      normalizedFileName: normalizeLookupPath(fileName),
      withoutExt,
      normalizedWithoutExt: normalizeLookupPath(withoutExt)
    });
  }

  return projectFileIndex;
}

function isKnownWorkerPath(projectFileIndex, workerPath) {
  if (!workerPath) {
    return false;
  }

  const normalizedWorkerPath = normalizeLookupPath(workerPath);
  const strippedWorkerPath = stripRelativePrefix(workerPath);
  const workerFileName = workerPath.replace(/^.*[\\\/]/, '');
  const normalizedWorkerFileName = normalizeLookupPath(workerFileName);
  const workerWithoutExt = workerFileName.replace(/\.[^.]+$/, '');
  const normalizedWorkerWithoutExt = normalizeLookupPath(workerWithoutExt);

  for (const projectFile of projectFileIndex) {
    if (
      projectFile.normalizedFullPath === normalizedWorkerPath ||
      projectFile.normalizedFileName === normalizedWorkerFileName ||
      projectFile.normalizedWithoutExt === normalizedWorkerWithoutExt
    ) {
      return true;
    }

    if (strippedWorkerPath && projectFile.normalizedFullPath.endsWith(strippedWorkerPath)) {
      return true;
    }
  }

  return false;
}

/**
 * Detects broken Web Workers
 */
export class WorkerDetector {
  detect(systemMap, advancedAnalysis) {
    const brokenWorkers = [];
    const safeAdvancedAnalysis = advancedAnalysis || {};
    const fileResults = safeAdvancedAnalysis.fileResults || {};
    const projectFileIndex = buildProjectFileIndex(systemMap);

    for (const [filePath, analysis] of Object.entries(fileResults)) {
      const workerCreations = analysis?.webWorkers?.outgoing || [];

      for (const creation of workerCreations) {
        if (creation.type !== 'worker_creation') {
          continue;
        }

        const workerPath = creation.workerPath || '';

        if (!isKnownWorkerPath(projectFileIndex, workerPath)) {
          brokenWorkers.push({
            sourceFile: filePath,
            workerPath,
            line: creation.line,
            type: 'WORKER_NOT_FOUND',
            severity: 'HIGH',
            reason: `Worker '${workerPath}' not found in project`,
            suggestion: 'Check if the worker file exists or if the path is correct'
          });
        }
      }
    }

    return {
      total: brokenWorkers.length,
      byFile: groupByFile(brokenWorkers),
      all: brokenWorkers
    };
  }
}

export default WorkerDetector;
