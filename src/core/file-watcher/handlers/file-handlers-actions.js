import { runAsyncBoundary } from '../../../shared/compiler/async-boundary.js';
import { detectImpactWave } from '../guards/impact-wave/index.js';
import { detectDuplicateRisk } from '../guards/duplicate-risk/risk.js';
import { countRequiredSignatureParams, extractRelatedFilePath } from '../shared/atom-relation-utils.js';

async function runGuardAction(guardFn, fileWatcher, filePath, options = {}, previousAtoms = []) {
  return await guardFn(
    fileWatcher.rootPath,
    filePath,
    previousAtoms,
    fileWatcher,
    async fp => await fileWatcher.getAtomsForFile(fp),
    options
  );
}

export async function detectDuplicateRiskForFile(fileWatcher, filePath, options = {}) {
  return await runAsyncBoundary('detectDuplicateRiskForFile', async () => {
    try {
      return await runGuardAction(detectDuplicateRisk, fileWatcher, filePath, options);
    } catch (error) {
      throw error;
    }
  });
}

export async function detectImpactWaveForFile(fileWatcher, filePath, previousAtoms = [], options = {}) {
  return await runAsyncBoundary('detectImpactWaveForFile', async () => {
    try {
      const guardOptions = {
        ...options,
        relationHelpers: {
          countRequiredSignatureParams,
          extractRelatedFilePath
        }
      };

      return await runGuardAction(detectImpactWave, fileWatcher, filePath, guardOptions, previousAtoms);
    } catch (error) {
      throw error;
    }
  });
}
