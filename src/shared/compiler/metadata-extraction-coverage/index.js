export {
  collectMetadataCoverageTables
} from './metadata-extraction-coverage-report-tables.js';

export {
  collectMetadataCoverageCounts
} from './metadata-extraction-coverage-report-counts.js';

export {
  collectMetadataCoverageFields
} from './metadata-extraction-coverage-report-fields.js';

export {
  buildMetadataCoverageSummary
} from './metadata-extraction-coverage-report-summary.js';

export {
  buildMetadataCoverageReport,
} from './metadata-extraction-coverage-report-assembly.js';

export function shouldRepairMetadataCoverage(initialCoverage) {
  return initialCoverage.healthy === false
    || (Array.isArray(initialCoverage.topMissingFields) && initialCoverage.topMissingFields.some((field) => REPAIRABLE_MISSING_FIELDS.has(field?.field)));
}

const REPAIRABLE_MISSING_FIELDS = new Set([
  'test_callback_type',
  'hash',
  'calls_json',
  'identifier_refs_json',
  'culture',
  'culture_role',
  'definitions_json',
  'semantic_analysis_json',
  'transitive_depends_json',
  'transitive_dependents_json'
]);
