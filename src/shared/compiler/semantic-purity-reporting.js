/**
 * @fileoverview Canonical semantic purity reporting helpers.
 *
 * Aggregates atom-level semantic purity evaluations into reusable summaries so
 * tools stop reclassifying side effects inline.
 *
 * @module shared/compiler/semantic-purity-reporting
 */

import { evaluateAtomSemanticPurity } from './atom-evaluation.js';
import { compactArray } from './core-utils.js';

function buildReasonFrequency(evaluations = []) {
  const counts = new Map();
  for (const evaluation of evaluations) {
    for (const reason of evaluation.reasons || []) {
      counts.set(reason, (counts.get(reason) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));
}

export function summarizeAtomSemanticPurity(atoms = [], options = {}) {
  const { highThreshold = 34, mediumThreshold = 69 } = options;
  const normalizedAtoms = compactArray(atoms);
  const evaluations = normalizedAtoms.map((atom) => ({
    atomId: atom.id,
    atomName: atom.name,
    filePath: atom.filePath || atom.file_path || null,
    evaluation: evaluateAtomSemanticPurity(atom)
  }));

  const scoreTotal = evaluations.reduce((sum, item) => sum + item.evaluation.score, 0);
  const averageScore = evaluations.length > 0
    ? Math.round((scoreTotal / evaluations.length) * 100) / 100
    : 100;

  const impureAtoms = evaluations.filter((item) => item.evaluation.score <= mediumThreshold);
  const highImpactAtoms = evaluations.filter((item) => item.evaluation.score <= highThreshold);

  return {
    totalAtoms: evaluations.length,
    averageScore,
    severity: averageScore <= highThreshold ? 'high' : averageScore <= mediumThreshold ? 'medium' : 'low',
    impureCount: impureAtoms.length,
    highImpactCount: highImpactAtoms.length,
    topReasons: buildReasonFrequency(evaluations.map((item) => item.evaluation)).slice(0, 8),
    atoms: evaluations
  };
}
