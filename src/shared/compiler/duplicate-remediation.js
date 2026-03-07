/**
 * @fileoverview Canonical remediation helpers for duplicate DNA groups.
 *
 * @module shared/compiler/duplicate-remediation
 */

import {
  buildStandardPlan,
  buildStandardItem
} from './remediation-plan-builder.js';

function pickCanonicalInstance(instances = []) {
  return [...instances]
    .sort((a, b) => {
      const importanceDelta = Number(b.importanceScore || 0) - Number(a.importanceScore || 0);
      if (importanceDelta !== 0) return importanceDelta;
      const callerDelta = Number(b.callerCount || 0) - Number(a.callerCount || 0);
      if (callerDelta !== 0) return callerDelta;
      return Number(b.changeFrequency || 0) - Number(a.changeFrequency || 0);
    })[0] || null;
}

function getDuplicateGroupActions(group = {}, canonical = null) {
  const actions = [];

  if (canonical) {
    actions.push(`Prefer reusing '${canonical.name}' in ${canonical.file} as the canonical implementation.`);
  }

  if ((group.groupSize || 0) > 2) {
    actions.push('Collapse the duplicate cluster before adding more variants of the same logic.');
  }

  actions.push('Replace copied implementations with imports or direct calls to the canonical atom.');
  actions.push('Delete or deprecate duplicate atoms once call sites are migrated.');
  return actions;
}

export function buildDuplicateRemediation(group = {}) {
  const canonical = pickCanonicalInstance(group.instances);

  return buildStandardItem({
    id: canonical?.id,
    name: canonical?.name,
    diagnosis: `Detected duplicate DNA cluster with ${group.groupSize} instances.`,
    actions: getDuplicateGroupActions(group, canonical),
    // Extensions
    groupSize: group.groupSize || 0,
    urgencyScore: group.urgencyScore || 0,
    canonical,
    duplicateFiles: [...new Set((group.instances || []).map((instance) => instance.file))]
  });
}

export function buildDuplicateRemediationPlan(groups = []) {
  const items = groups.map(buildDuplicateRemediation);

  return buildStandardPlan({
    total: items.length,
    items,
    recommendation: 'Consolidate duplicate DNA groups around a canonical implementation before the cluster grows.',
    emptyRecommendation: 'No duplicate groups require remediation.'
  });
}
