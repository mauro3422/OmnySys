import { summarizeMetadataExtractionCoverage } from '../metadata-extraction-coverage/coverage.js';

export function compactMetadataExtractionCoverage(metadataExtractionCoverage = null) {
  return summarizeMetadataExtractionCoverage(metadataExtractionCoverage);
}
