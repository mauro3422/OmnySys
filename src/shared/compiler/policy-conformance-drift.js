import { detectSignalCoverageDrift } from './signal-coverage.js';
import { detectPipelineOrphanDrift } from './pipeline-orphans.js';
import { detectDeadCodeDrift } from './dead-code-utils.js';
import { detectLiveRowDrift } from './live-row-utils.js';

export function collectManualDriftFindings(normalizedPath, source) {
  return [
    ...detectSignalCoverageDrift(source, normalizedPath).filter(Boolean),
    ...detectLiveRowDrift(source, normalizedPath).filter(Boolean),
    ...detectPipelineOrphanDrift(source, normalizedPath).filter(Boolean),
    ...detectDeadCodeDrift(source, normalizedPath).filter(Boolean)
  ];
}
