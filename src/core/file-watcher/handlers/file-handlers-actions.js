import { detectImpactWave as detectImpactWaveGuard } from '../guards/impact-wave.js';
import { detectDuplicateRisk as detectDuplicateRiskGuard } from '../guards/duplicate-risk.js';
import { countRequiredSignatureParams, extractRelatedFilePath } from '../shared/atom-relation-utils.js';

export async function detectImpactWaveForFile(fileWatcher, filePath, previousAtoms = [], options = {}) {
  return await detectImpactWaveGuard(
    fileWatcher.rootPath,
    filePath,
    previousAtoms,
    fileWatcher,
    async fp => await fileWatcher.getAtomsForFile(fp),
    {
      ...options,
      relationHelpers: {
        countRequiredSignatureParams,
        extractRelatedFilePath
      }
    }
  );
}

export async function detectDuplicateRiskForFile(fileWatcher, filePath, options = {}) {
  return await detectDuplicateRiskGuard(fileWatcher.rootPath, filePath, fileWatcher, options);
}
