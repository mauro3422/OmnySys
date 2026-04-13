import { detectSignalCoverageDrift } from './coverage.js';
import { detectPipelineOrphanDrift } from './pipeline-orphans/index.js';
import { detectDeadCodeDrift } from './dead-code-utils.js';
import { detectLiveRowDrift } from './live-row-utils/index.js';

export function collectManualDriftFindings(normalizedPath, source) {
  return [
    ...detectSignalCoverageDrift(source, normalizedPath).filter(Boolean),
    ...detectLiveRowDrift(source, normalizedPath).filter(Boolean),
    ...detectPipelineOrphanDrift(source, normalizedPath).filter(Boolean),
    ...detectDeadCodeDrift(source, normalizedPath).filter(Boolean)
  ];
}
