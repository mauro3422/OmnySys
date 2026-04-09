import { takeSample } from './sample-helpers.js';

export function normalizeConnectedSystems(connectedSystems = [], limit = 8) {
  const normalized = (Array.isArray(connectedSystems) ? connectedSystems : [])
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return { name: item, role: 'consumer', systemKind: 'unknown' };
      }

      return {
        name: item.name || item.system || item.role || null,
        role: item.role || item.type || 'consumer',
        systemKind: item.systemKind || item.kind || item.role || 'unknown'
      };
    })
    .filter((item) => item?.name);

  return typeof limit === 'number'
    ? takeSample(normalized, limit)
    : normalized;
}

export function normalizeInventorySystems(systems = [], limit = 12) {
  const normalized = (Array.isArray(systems) ? systems : [])
    .map((item) => {
      if (!item) return null;

      if (typeof item === 'string') {
        return { name: item, role: 'inventory', systemKind: 'unknown' };
      }

      return {
        name: item.name || item.surface || item.entrypoint || item.id || item.system || null,
        role: item.role || item.kind || 'inventory',
        systemKind: item.systemKind || item.kind || item.role || 'unknown'
      };
    })
    .filter((item) => item?.name);

  return typeof limit === 'number'
    ? takeSample(normalized, limit)
    : normalized;
}

export function buildPropagationAdoptionSummary({
  connectedSystems = [],
  surfacedSystems = [],
  requiredSystems = []
} = {}) {
  const required = normalizeInventorySystems(requiredSystems.length > 0 ? requiredSystems : connectedSystems, null);
  const surfaced = normalizeConnectedSystems(
    surfacedSystems.length > 0
      ? surfacedSystems
      : (requiredSystems.length > 0 ? [] : connectedSystems),
    null
  );
  const surfacedSystemNames = surfaced.map((item) => item.name);
  const surfacedNameSet = new Set(surfacedSystemNames);
  const surfacedKindSet = new Set(surfaced.map((item) => item.systemKind || 'unknown'));
  const adoptedSystems = required.filter((item) => surfacedNameSet.has(item.name) || surfacedKindSet.has(item.systemKind || 'unknown'));
  const missingSystems = required.filter((item) => !surfacedNameSet.has(item.name) && !surfacedKindSet.has(item.systemKind || 'unknown'));
  const requiredSystemNames = required.map((item) => item.name);
  const adoptedSystemNames = adoptedSystems.map((item) => item.name);
  const missingSystemNames = missingSystems.map((item) => item.name);
  const requiredKindCounts = required.reduce((acc, item) => {
    const kind = item.systemKind || 'unknown';
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, {});
  const surfacedKindCounts = surfaced.reduce((acc, item) => {
    const kind = item.systemKind || 'unknown';
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, {});
  const missingKindCounts = missingSystems.reduce((acc, item) => {
    const kind = item.systemKind || 'unknown';
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, {});
  const requiredSystemCount = required.length;
  const surfacedSystemCount = adoptedSystems.length;
  const missingSystemCount = missingSystems.length;
  const coverageRatio = requiredSystemCount > 0
    ? Math.round((surfacedSystemCount / requiredSystemCount) * 100) / 100
    : 1;

  let adoptionState = 'ready';
  if (requiredSystemCount === 0) {
    adoptionState = 'ready';
  } else if (missingSystemCount === 0) {
    adoptionState = 'ready';
  } else if (coverageRatio >= 0.75) {
    adoptionState = 'watching';
  } else if (coverageRatio > 0) {
    adoptionState = 'stale';
  } else {
    adoptionState = 'blocked';
  }

  const surfacedLabel = surfacedSystemNames.length > 0
    ? surfacedSystemNames.join(', ')
    : 'no surfaced systems';
  const missingLabel = missingSystemNames.length > 0
    ? missingSystemNames.join(', ')
    : 'none';
  const countByRole = (items = []) => items.reduce((acc, item) => {
    const role = item?.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  const requiredRoleCounts = countByRole(required);
  const surfacedRoleCounts = countByRole(adoptedSystems);
  const missingRoleCounts = countByRole(missingSystems);

  return {
    adoptionState,
    coverageRatio,
    requiredSystemCount,
    surfacedSystemCount,
    missingSystemCount,
    requiredSystems,
    surfacedSystems: surfaced,
    adoptedSystems,
    missingSystems,
    requiredSystemNames,
    surfacedSystemNames,
    adoptedSystemNames,
    missingSystemNames,
    nextAction: missingSystemCount > 0
      ? `Update ${missingSystemNames.slice(0, 3).join(', ')} to surface the propagation pattern.`
      : 'All connected systems already surface the propagation pattern.',
    reason: requiredSystemCount > 0
      ? `${surfacedSystemCount}/${requiredSystemCount} connected system(s) already surface the propagation pattern; missing=${missingLabel}.`
      : 'No connected systems were reported by the propagation plan.',
    summaryText: `state=${adoptionState} | coverage=${coverageRatio} | required=${requiredSystemCount} | surfaced=${surfacedSystemCount} | missing=${missingSystemCount} | surfacedSystems=${surfacedLabel}`,
    surfacedSystemLabels: surfacedLabel,
    missingSystemLabels: missingLabel,
    requiredRoleCounts,
    surfacedRoleCounts,
    missingRoleCounts,
    requiredKindCounts,
    surfacedKindCounts,
    missingKindCounts,
    missingRoleLabels: Object.entries(missingRoleCounts).map(([role, count]) => `${role}:${count}`).join(', ') || 'none',
    missingKindLabels: Object.entries(missingKindCounts).map(([kind, count]) => `${kind}:${count}`).join(', ') || 'none'
  };
}

export function calculateConfidence({
  automationState,
  normalizationSafetyLevel,
  policyCoverageState,
  promotionState,
  connectedSystemCount
}) {
  if (automationState === 'already_folderized') {
    return 100;
  }

  if (automationState === 'ready') {
    return Math.min(100, 82 + Math.min(connectedSystemCount, 8) + (normalizationSafetyLevel === 'safe' ? 5 : 0));
  }

  if (automationState === 'review') {
    return Math.max(20, 58 - (normalizationSafetyLevel === 'risky' ? 10 : 0) - (policyCoverageState === 'stale' ? 5 : 0) - (promotionState === 'watching' ? 5 : 0));
  }

  return Math.max(0, 20 - (normalizationSafetyLevel === 'missing' ? 10 : 0));
}

export function buildAutomationReason({
  automationState,
  decision,
  propagationMode,
  normalizationSafetyLevel,
  policyCoverageState,
  promotionState,
  connectedSystemNames,
  propagationAdoption,
  driftReason,
  recommendationStrategy
}) {
  if (automationState === 'already_folderized') {
    return 'Reuse the existing folderized family and normalize names only if the family is already stable.';
  }

  if (automationState === 'ready') {
    const connectedLabel = connectedSystemNames.length > 0 ? connectedSystemNames.join(', ') : 'the connected systems';
    return `Folderization can execute because propagation is attached to ${connectedLabel} and the normalization plan is safe; adoption is aligned across ${propagationAdoption?.surfacedSystemCount || 0} surfaced system(s).`;
  }

  if (recommendationStrategy === 'split_large_file') {
    return propagationAdoption?.missingSystemCount > 0
      ? `Folderization should pause because ${propagationAdoption.missingSystemNames.slice(0, 3).join(', ')} still need the propagation pattern and the family should be split first with split_large_file.`
      : 'Folderization should pause because no DB-backed folderization candidate is available; split the monolith with split_large_file before retrying folderization.';
  }

  if (automationState === 'review') {
    return propagationAdoption?.missingSystemCount > 0
      ? `Folderization should be reviewed because ${propagationAdoption.missingSystemNames.slice(0, 3).join(', ')} still need the propagation pattern and policy coverage is ${policyCoverageState || 'unknown'}.`
      : `Folderization should be reviewed because normalization is ${normalizationSafetyLevel} and policy coverage is ${policyCoverageState || 'unknown'}.`;
  }

  return driftReason
    ? `Folderization is blocked: ${driftReason}`
    : `Folderization is blocked because propagation=${propagationMode || 'blocked'} and recommendation=${recommendationStrategy || 'n/a'}.`;
}

export function buildExecutionTarget({
  decision,
  automationState,
  normalizationSafetyLevel,
  recommendationStrategy
}) {
  if (recommendationStrategy === 'split_large_file') {
    return 'split_large_file';
  }

  if (decision === 'already_folderized') {
    return 'rename_folderized_family';
  }

  if (automationState === 'ready' && normalizationSafetyLevel === 'safe') {
    return 'folderize_family';
  }

  if (decision === 'review') {
    return 'plan';
  }

  return 'analyze';
}
