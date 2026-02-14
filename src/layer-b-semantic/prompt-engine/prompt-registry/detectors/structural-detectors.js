/**
 * @fileoverview Structural Detectors
 * 
 * Detectores de arquetipos estructurales.
 * 
 * @module prompt-registry/detectors/structural-detectors
 * @version 1.0.0
 */

import { detectGodObject, detectOrphanModule } from '../../metadata-contract/index.js';

export const detectGodObjectArchetype = (metadata) => {
  const totalDependents = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);
  return detectGodObject(metadata.exportCount, totalDependents);
};

export const detectOrphanModuleArchetype = (metadata) => {
  const totalDependents = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);
  return detectOrphanModule(metadata.exportCount, totalDependents);
};

export const detectSingleton = (metadata) =>
  metadata.hasSingletonPattern === true ||
  (metadata.functionCount === 1 && metadata.exportCount === 1 && metadata.dependentCount > 5);

export const detectFacade = (metadata) => {
  const hasReExports = (metadata.reExportCount || 0) >= 3;
  const isMainlyReExporter = (metadata.exportCount || 0) > 0 && (metadata.functionCount || 0) <= 1;
  const isIndexFile = (metadata.filePath || '').endsWith('index.js') ||
    (metadata.filePath || '').endsWith('index.ts');
  return hasReExports || (isIndexFile && isMainlyReExporter && (metadata.exportCount || 0) >= 3);
};

export const detectConfigHub = (metadata) => {
  const exportsMany = (metadata.exportCount || 0) >= 5;
  const hasManyDependents = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0) >= 5;
  const fewFunctions = (metadata.functionCount || 0) <= 2;
  return exportsMany && hasManyDependents && fewFunctions;
};

export const detectEntryPoint = (metadata) => {
  const importsMuch = (metadata.importCount || 0) >= 5;
  const nobodyImportsIt = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0) === 0;
  return importsMuch && nobodyImportsIt;
};

export default {
  detectGodObjectArchetype, detectOrphanModuleArchetype, detectSingleton,
  detectFacade, detectConfigHub, detectEntryPoint
};
