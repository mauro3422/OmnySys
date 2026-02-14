/**
 * @fileoverview WorkerDetector.js
 * 
 * Detects broken Web Workers.
 * 
 * @module analyses/tier3/detectors/WorkerDetector
 */

import { groupByFile } from '../utils/issue-utils.js';

/**
 * Detects broken Web Workers
 */
export class WorkerDetector {
  detect(systemMap, advancedAnalysis) {
    const brokenWorkers = [];
    const fileResults = advancedAnalysis?.fileResults || {};
    const allProjectFiles = Object.keys(systemMap.files || {});

    const projectFileNames = allProjectFiles.map(f => ({
      fullPath: f,
      fileName: f.replace(/^.*[\\\/]/, ''),
      withoutExt: f.replace(/^.*[\\\/]/, '').replace(/\.[^.]+$/, '')
    }));

    for (const [filePath, analysis] of Object.entries(fileResults)) {
      const workerCreations = analysis.webWorkers?.outgoing?.filter(
        w => w.type === 'worker_creation'
      ) || [];

      for (const creation of workerCreations) {
        const workerPath = creation.workerPath;
        const workerFileName = workerPath.replace(/^.*[\\\/]/, '');
        const workerWithoutExt = workerFileName.replace(/\.[^.]+$/, '');

        const exists = projectFileNames.some(projFile => 
          projFile.fileName === workerFileName ||
          projFile.fileName === workerWithoutExt ||
          projFile.withoutExt === workerWithoutExt ||
          projFile.fullPath.includes(workerPath.replace('./', '').replace('../', ''))
        );

        if (!exists) {
          brokenWorkers.push({
            sourceFile: filePath,
            workerPath: workerPath,
            line: creation.line,
            type: 'WORKER_NOT_FOUND',
            severity: 'HIGH',
            reason: `Worker '${workerPath}' not found in project`,
            suggestion: `Check if the worker file exists or if the path is correct`
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
