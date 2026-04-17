// Thin barrel — re-exports everything from the folderized family via index.js
export {
  normalizeFocusPaths,
  normalizeGuidancePath,
  splitPathSegments,
  getPathTailSegment,
  countSharedPrefixSegments,
  scoreGuidanceFamily,
  selectGuidanceFamily,
  buildEmptyRecommendation,
  buildFolderizationRecommendation,
  buildFolderizationPropagationSummary,
  buildFolderizationSummary,
  buildFolderizationDriftSignal,
  buildFolderizationContractDriftSignal,
  buildFolderizationCreationGuidance,
  buildFolderizationReport,
  buildFolderizationReportFromRows,
  buildFolderizationReportFromRepo,
  buildEmptyFolderizationReport
} from './folderization-report/index.js';
