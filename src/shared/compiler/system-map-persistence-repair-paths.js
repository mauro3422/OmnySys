export {
  normalizeDbPath,
  toJsonText,
  dependencyKey,
  dedupeDependencies,
  mergeUniquePathList
} from './system-map-persistence-repair-normalization.js';

export {
  parseImportSource,
  parseImportSymbols,
  buildKnownFilePathIndex,
  loadKnownFilePathRows,
  generateTargetCandidates,
  resolveTargetPathFromKnownFiles
} from './system-map-persistence-repair-resolution.js';
