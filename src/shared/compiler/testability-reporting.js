/**
 * @fileoverview Canonical testability reporting helpers.
 *
 * Builds reusable file/module-level summaries from atom testability
 * evaluations so MCP/query/watcher consumers stop rebuilding low-testability
 * heuristics inline.
 *
 * @module shared/compiler/testability-reporting
 */

import { evaluateAtomTestability } from './atom-evaluation.js';
import { compactArray } from './core-utils.js';
import { buildReasonFrequency } from './reason-frequency.js';

export function summarizeAtomTestability(atoms = [], options = {}) {
  const { highThreshold = 34, mediumThreshold = 69 } = options;
  const normalizedAtoms = compactArray(atoms);
  const evaluations = normalizedAtoms.map((atom) => ({
    atomId: atom.id,
    atomName: atom.name,
    filePath: atom.filePath || atom.file_path || null,
    evaluation: evaluateAtomTestability(atom)
  }));

  const scoreTotal = evaluations.reduce((sum, item) => sum + item.evaluation.score, 0);
  const averageScore = evaluations.length > 0
    ? Math.round((scoreTotal / evaluations.length) * 100) / 100
    : 100;

  const lowTestabilityAtoms = evaluations.filter((item) => item.evaluation.score <= mediumThreshold);
  const highRiskAtoms = evaluations.filter((item) => item.evaluation.score <= highThreshold);

  return {
    totalAtoms: evaluations.length,
    averageScore,
    severity: averageScore <= highThreshold ? 'high' : averageScore <= mediumThreshold ? 'medium' : 'low',
    lowTestabilityCount: lowTestabilityAtoms.length,
    highRiskCount: highRiskAtoms.length,
    topReasons: buildReasonFrequency(evaluations.map((item) => item.evaluation)).slice(0, 8),
    atoms: evaluations
  };
}
