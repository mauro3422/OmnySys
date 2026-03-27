/**
 * @fileoverview Contract taxonomy reporting helpers.
 *
 * @module shared/compiler/contract-taxonomy-report
 */

import { loadContractTaxonomyRows } from './contract-taxonomy-query.js';
import { summarizeContractTaxonomyRows } from './contract-taxonomy-summary-helpers.js';

export function summarizeContractTaxonomy(db) {
  if (!db) {
    return {
      coverage: { totalRelevantAtoms: 0, classifiedAtoms: 0, coverageRatio: 0 },
      byFamily: {},
      byFlavor: {},
      byTruthRole: {},
      byRepresentationLevel: {},
      summary: {
        dominantFamily: null,
        dominantFlavor: null,
        canonicalRatio: 0
      }
    };
  }

  return summarizeContractTaxonomyRows(loadContractTaxonomyRows(db));
}
