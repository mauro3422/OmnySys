import { detectImpactWave as detectImpactWaveGuard } from '../guards/impact-wave.js';
import { detectDuplicateRisk as detectDuplicateRiskGuard } from '../guards/duplicate-risk.js';
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
  return await runGuardAction(detectDuplicateRiskGuard, fileWatcher, filePath, options);
}

export async function detectImpactWaveForFile(fileWatcher, filePath, previousAtoms = [], options = {}) {
  const guardOptions = {
    ...options,
    relationHelpers: {
      countRequiredSignatureParams,
      extractRelatedFilePath
    }
  };

  return await runGuardAction(detectImpactWaveGuard, fileWatcher, filePath, guardOptions, previousAtoms);
}
