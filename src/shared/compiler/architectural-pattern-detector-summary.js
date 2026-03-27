import { ARCHITECTURAL_PATTERNS } from './architectural-pattern-detector-constants.js';

export function summarizeArchitecturalPatterns(results) {
  if (!results || results.patterns.length === 0) {
    return 'No architectural patterns detected';
  }

  const summaries = [];

  if (results.primaryPattern === ARCHITECTURAL_PATTERNS.GOD_OBJECT) {
    summaries.push('God Object detected - file has too many responsibilities');
  }

  if (results.primaryPattern === ARCHITECTURAL_PATTERNS.ORPHAN_MODULE) {
    summaries.push('Orphan Module detected - exports exist but no dependents');
  }

  if (results.suggestedLocation) {
    summaries.push(`Consider moving to ${results.suggestedLocation}`);
  }

  if (results.canonicalRecommendation) {
    summaries.push(results.canonicalRecommendation.action);
  }

  return summaries.join('. ');
}
