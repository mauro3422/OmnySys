/**
 * Canonical promotion summary for emergent systems and folderized families.
 *
 * This layer sits above folderization: it does not move files. It decides
 * which surfaced families or emergent compiler contracts are ready to be
 * promoted into canonical APIs and what should happen next.
 */

import { asNumber } from './core-utils.js';

function normalizeText(value, fallback = null) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(asNumber(value, 0))));
}

function buildPromotionTarget(candidate = {}, { index = 0, source = 'inventory' } = {}) {
  const role = normalizeText(candidate.role, 'emergent');
  const kind = normalizeText(candidate.kind, source === 'folderization' ? 'folderized_family' : 'emergent_surface');
  const centralityScore = clampScore(candidate.centralityScore);
  const propagationScore = clampScore(candidate.propagationScore);
  const promotionScore = clampScore((centralityScore * 0.6) + (propagationScore * 0.4));

  return {
    id: candidate.id || candidate.surface || candidate.entrypoint || `${source}:${kind}:${index}`,
    kind,
    role,
    status: candidate.status || (role === 'canonical' ? 'canonical' : 'emergent'),
    surface: candidate.surface || candidate.entrypoint || null,
    canonicalTarget: candidate.canonicalTarget || candidate.entrypoint || candidate.surface || null,
    domain: candidate.domain || candidate.scope || null,
    scope: candidate.scope || null,
    directory: candidate.directory || candidate.folder || null,
    centralityScore,
    propagationScore,
    promotionScore,
    recommendation: normalizeText(candidate.recommendation, null),
    reason: normalizeText(candidate.summary, candidate.reason || null),
    nextAction: normalizeText(candidate.nextAction, candidate.recommendedAction || null),
    evidence: candidate.evidence || {},
    source
  };
}

function buildFolderizationPromotionTarget(folderizationReport = null) {
  if (!folderizationReport) {
    return null;
  }

  const summary = folderizationReport.summary || {};
  const creationGuidance = folderizationReport.creationGuidance || {};
  const propagation = folderizationReport.propagation || {};
  const decision = folderizationReport.decision || 'reject';
  const folderPath = creationGuidance.preferredFolder || creationGuidance.recommendedFolder || summary.nextBestFolder || null;

  if (!folderPath && decision !== 'already_folderized') {
    return null;
  }

  const promotionScore = clampScore(
    (decision === 'already_folderized' ? 90 : 72)
    + (Number(summary.alreadyFolderizedFamilies || 0) > 0 ? 6 : 0)
    + (Number(propagation.impactedFileCount || 0) > 0 ? 4 : 0)
    + (Number(propagation.rewriteCount || 0) > 0 ? 4 : 0)
  );

  return {
    id: folderPath || summary.guidanceFocusPath || 'folderization-promotion',
    kind: 'folderized_family',
    role: decision === 'already_folderized' ? 'canonical' : 'bridge',
    status: decision,
    surface: folderPath,
    canonicalTarget: folderPath,
    domain: summary.guidanceScopePath || summary.guidanceFocusPath || null,
    scope: summary.guidanceScopePath || null,
    directory: folderPath,
    centralityScore: promotionScore,
    propagationScore: clampScore(promotionScore - (decision === 'already_folderized' ? 4 : 10)),
    promotionScore,
    recommendation: decision === 'already_folderized'
      ? 'Normalize the existing folderized family into short role-based basenames and keep the barrel thin.'
      : 'Promote the folderized family into a canonical contract and migrate callers together.',
    reason: summary.recommendedAction || summary.whyThisFirst || creationGuidance.selectionReason || null,
    nextAction: summary.nextBestStem
      ? `Promote ${folderPath} as the canonical surface and keep ${summary.nextBestStem} as the role stem.`
      : 'Promote the folderized family into a canonical contract and migrate callers together.',
    evidence: {
      folderization: folderizationReport
    },
    source: 'folderization'
  };
}

function buildPromotionSummary({
  systemInventory = null,
  folderizationReport = null,
  promotionTargets = []
} = {}) {
  const inventorySummary = systemInventory?.summary || systemInventory || {};
  const folderizationSummary = folderizationReport?.summary || folderizationReport || {};
  const inventoryState = normalizeText(inventorySummary.inventoryState, 'watching');
  const folderizationDecision = normalizeText(folderizationReport?.decision, null);
  const folderizationState = normalizeText(folderizationReport?.drift?.state || folderizationSummary.driftState || folderizationReport?.summary?.dbSyncState || null);
  const folderizationPromotionTarget = buildFolderizationPromotionTarget(folderizationReport);
  const targets = [
    ...(folderizationPromotionTarget ? [folderizationPromotionTarget] : []),
    ...promotionTargets.map((target, index) => buildPromotionTarget(target, { index, source: 'inventory' }))
  ];
  const uniqueTargets = [];
  const seen = new Set();

  for (const target of targets) {
    const key = target.id || target.surface || target.canonicalTarget;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueTargets.push(target);
  }

  const topPromotionTargets = uniqueTargets
    .sort((left, right) =>
      (right.promotionScore || 0) - (left.promotionScore || 0)
        || (right.centralityScore || 0) - (left.centralityScore || 0)
        || String(left.id || '').localeCompare(String(right.id || ''))
    )
    .slice(0, 5);

  const candidateCount = topPromotionTargets.length;
  const folderizedFamilyCount = Math.max(
    folderizationPromotionTarget ? 1 : 0,
    Number(folderizationSummary.alreadyFolderizedFamilies || 0)
  );
  const emergentCandidateCount = topPromotionTargets.filter((item) => item.source === 'inventory' && item.role !== 'canonical').length;
  const canonicalCandidateCount = topPromotionTargets.filter((item) => item.role === 'canonical').length;
  const promotionState = inventoryState === 'ready' && candidateCount > 0 && (folderizationState == null || folderizationState === 'fresh')
    ? 'ready'
    : 'watching';
  const nextAction = topPromotionTargets[0]?.nextAction
    || folderizationSummary.nextAction
    || inventorySummary.nextAction
    || 'Promote the strongest emergent surface into a canonical API and migrate callers together.';

  const summaryText = [
    `state=${promotionState}`,
    `candidates=${candidateCount}`,
    `folderized=${folderizedFamilyCount}`,
    `emergent=${emergentCandidateCount}`,
    `canonical=${canonicalCandidateCount}`,
    `inventory=${inventoryState}`,
    folderizationDecision ? `folderization=${folderizationDecision}` : null,
    `next=${nextAction}`
  ].filter(Boolean).join(' | ');

  return {
    promotionState,
    inventoryState,
    folderizationState,
    folderizationDecision,
    candidateCount,
    folderizedFamilyCount,
    emergentCandidateCount,
    canonicalCandidateCount,
    nextAction,
    summaryText,
    topPromotionTargets,
    folderizationPromotionTarget,
    inventorySummary
  };
}

export function buildCanonicalPromotionSnapshot({
  projectPath = null,
  scopePath = null,
  focusPath = null,
  systemInventory = null,
  folderizationReport = null,
  limit = 5
} = {}) {
  const inventoryReport = systemInventory && typeof systemInventory === 'object' ? systemInventory : null;
  const topPromotionTargets = Array.isArray(inventoryReport?.topPromotionCandidates)
    ? inventoryReport.topPromotionCandidates.slice(0, limit)
    : [];
  const promotionSummary = buildPromotionSummary({
    systemInventory: inventoryReport,
    folderizationReport,
    promotionTargets: topPromotionTargets
  });

  return {
    projectPath,
    scopePath,
    focusPath,
    capturedAt: new Date().toISOString(),
    inventory: inventoryReport,
    folderization: folderizationReport || null,
    promotionTargets: promotionSummary.topPromotionTargets,
    summary: promotionSummary
  };
}

export function buildCanonicalPromotionReport(snapshot = null) {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  const summary = snapshot.summary || {};

  return {
    promotionState: summary.promotionState || 'watching',
    inventoryState: summary.inventoryState || 'watching',
    folderizationState: summary.folderizationState || null,
    folderizationDecision: summary.folderizationDecision || null,
    candidateCount: summary.candidateCount || 0,
    folderizedFamilyCount: summary.folderizedFamilyCount || 0,
    emergentCandidateCount: summary.emergentCandidateCount || 0,
    canonicalCandidateCount: summary.canonicalCandidateCount || 0,
    nextAction: summary.nextAction || null,
    summaryText: summary.summaryText || null,
    topPromotionTargets: Array.isArray(snapshot.promotionTargets) ? snapshot.promotionTargets.slice(0, 5) : [],
    inventory: snapshot.inventory || null,
    folderization: snapshot.folderization || null
  };
}

export function summarizeCanonicalPromotion(snapshot = null) {
  return buildCanonicalPromotionReport(snapshot);
}
