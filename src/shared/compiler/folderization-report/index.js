export {
  normalizeFocusPaths,
  normalizeGuidancePath,
  splitPathSegments,
  getPathTailSegment,
  countSharedPrefixSegments
} from './path-utils.js';

export {
  scoreGuidanceFamily,
  selectGuidanceFamily
} from './family-selection.js';

export {
  buildEmptyRecommendation,
  buildFolderizationRecommendation
} from './recommendations.js';

export { buildFolderizationPropagationSummary } from './propagation-summary.js';
export { buildFolderizationSummary } from './summary-builder.js';
export { buildFolderizationDriftSignal, buildFolderizationContractDriftSignal } from './drift-signal.js';
export { buildFolderizationCreationGuidance } from './creation-guidance.js';

export {
  buildFolderizationReport,
  buildFolderizationReportFromRows,
  buildFolderizationReportFromRepo,
  buildEmptyFolderizationReport
} from './report-builder.js';
