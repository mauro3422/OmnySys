import { summarizeCompilerDriftAssessment } from '../compiler-drift-assessment.js';

export function compactDriftAssessment(driftAssessment = null) {
  return driftAssessment ? summarizeCompilerDriftAssessment(driftAssessment) : null;
}
