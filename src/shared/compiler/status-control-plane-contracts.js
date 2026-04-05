/**
 * Canonical control-plane contracts shared by status, health and inventory surfaces.
 *
 * This module holds the policy/coverage/tooltip-style summaries so the generic
 * status summary helpers can stay focused on dashboard and panel shaping.
 */

import { normalizeCount } from './contract-helpers.js';
import { takeSample } from './sample-helpers.js';

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function toCoveragePercent(value) {
  const normalized = Number(value) || 0;
  return Math.max(0, Math.min(100, Math.round(normalized <= 1 ? normalized * 100 : normalized)));
}

export function resolvePolicyCoverageSummary(status = {}) {
  const systemInventory = status.systemInventory || {};
  const inventorySummary = systemInventory.summary || {};
  const compilerExplainability = status.compilerExplainability || {};
  const integrationCoveragePct = Number(firstDefined(
    systemInventory.integrationCoveragePct,
    inventorySummary.integrationCoveragePct,
    compilerExplainability.systemInventory?.integrationCoveragePct,
    compilerExplainability.systemInventory?.summary?.integrationCoveragePct,
    0
  )) || 0;
  const metadataCoveragePct = Number(firstDefined(
    systemInventory.metadataCoveragePct,
    inventorySummary.metadataCoveragePct,
    compilerExplainability.systemInventory?.metadataCoveragePct,
    compilerExplainability.systemInventory?.summary?.metadataCoveragePct,
    0
  )) || 0;
  const policyCoverage = firstDefined(
    systemInventory.policyCoverage,
    inventorySummary.policyCoverage,
    compilerExplainability.policyCoverage
  );

  if (!policyCoverage) {
    return null;
  }

  return {
    state: firstDefined(systemInventory.policyCoverageState, inventorySummary.policyCoverageState, policyCoverage.coverageState, 'watching'),
    score: normalizeCount(firstDefined(systemInventory.policyCoverageScore, inventorySummary.policyCoverageScore, policyCoverage.coverageScore, 0)),
    drift: normalizeCount(firstDefined(systemInventory.policyCoverageDriftCount, inventorySummary.policyCoverageDriftCount, policyCoverage.policyDriftCount, 0)),
    expansion: firstDefined(systemInventory.policyCoveragePropagationState, inventorySummary.policyCoveragePropagationState, policyCoverage.propagationExpansionState, 'n/a'),
    coverageRatio: Number(firstDefined(systemInventory.policyCoverageRatio, inventorySummary.policyCoverageRatio, policyCoverage.coverageRatio, 0)) || 0,
    coveragePercent: toCoveragePercent(firstDefined(systemInventory.policyCoverageRatio, inventorySummary.policyCoverageRatio, policyCoverage.coverageRatio, 0)),
    nextAction: firstDefined(systemInventory.policyCoverage?.nextAction, inventorySummary.nextAction, policyCoverage.nextAction, 'n/a'),
    integrationCoveragePct,
    metadataCoveragePct,
    policyCoverage
  };
}

export function resolveControlPlaneContracts(status = {}) {
  const metricsSnapshot = status.metricsSnapshot || {};
  const healthSnapshot = status.healthSnapshot || {};
  const compilerExplainability = status.compilerExplainability || {};
  const systemInventory = firstDefined(
    status.systemInventory,
    healthSnapshot.systemInventory,
    metricsSnapshot.systemInventory
  );
  const canonicalPromotion = firstDefined(
    status.canonicalPromotion,
    healthSnapshot.canonicalPromotion,
    metricsSnapshot.canonicalPromotion
  );
  const policyCoverage = resolvePolicyCoverageSummary({
    ...status,
    systemInventory: systemInventory || status.systemInventory,
    compilerExplainability
  });
  const folderizationAutomation = firstDefined(
    compilerExplainability.folderization?.automation,
    healthSnapshot.compilerExplainability?.folderization?.automation,
    metricsSnapshot.compilerExplainability?.folderization?.automation
  );
  const folderizationAdoption = firstDefined(
    folderizationAutomation?.propagationAdoption,
    compilerExplainability.folderization?.automation?.propagationAdoption,
    healthSnapshot.compilerExplainability?.folderization?.automation?.propagationAdoption,
    metricsSnapshot.compilerExplainability?.folderization?.automation?.propagationAdoption
  );
  const propagation = firstDefined(
    metricsSnapshot.propagation,
    metricsSnapshot.current?.folderizationPropagation
  );

  return {
    systemInventory: systemInventory || null,
    canonicalPromotion: canonicalPromotion || null,
    policyCoverage,
    folderizationAutomation: folderizationAutomation || null,
    folderizationAdoption: folderizationAdoption || null,
    integrationCoveragePct: Number(systemInventory?.integrationCoveragePct || systemInventory?.summary?.integrationCoveragePct || 0) || 0,
    propagation,
    historyStores: firstDefined(
      systemInventory?.historyStores,
      systemInventory?.summary?.historyStores,
      healthSnapshot.systemInventory?.historyStores,
      metricsSnapshot.systemInventory?.historyStores
    )
  };
}

export function resolveDashboardControlPlaneContracts(snapshot = null, compilerExplainability = null) {
  const normalizedSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const current = normalizedSnapshot.current || {};
  const folderizationPropagation = current.folderizationPropagation || null;
  const canonicalPromotion = current.canonicalPromotion || null;
  const policyCoverage = compilerExplainability?.policyCoverage || compilerExplainability?.systemInventory?.policyCoverage || null;
  const propagationExpansion = compilerExplainability?.driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')
    || (compilerExplainability?.driftAssessment?.primaryIssue?.key === 'propagation_expansion' ? compilerExplainability.driftAssessment.primaryIssue : null);

  return {
    folderizationPropagation,
    canonicalPromotion,
    policyCoverage,
    folderizationAdoption: current.folderizationAutomation?.propagationAdoption || null,
    integrationCoveragePct: Number(compilerExplainability?.systemInventory?.integrationCoveragePct || compilerExplainability?.systemInventory?.summary?.integrationCoveragePct || 0) || 0,
    propagationExpansion,
    historyStores: compilerExplainability?.systemInventory?.historyStores || compilerExplainability?.systemInventory?.summary?.historyStores || null
  };
}

export function compactToolInventory(toolInventory) {
  if (!toolInventory || typeof toolInventory !== 'object') return null;

  const snapshot = toolInventory.snapshot || {};
  const report = toolInventory.report || {};

  return {
    totalTools: snapshot.summary?.totalTools || 0,
    categories: snapshot.summary?.categories || [],
    dominantCategory: report.dominantCategory || null,
    dominantSubgroup: report.dominantSubgroup || null,
    categoryConcentration: report.categoryConcentration || 0,
    concentration: report.subgroupConcentration || report.concentration || 0,
    subgroupConcentration: report.subgroupConcentration || 0,
    subgroupStats: takeSample(report.subgroupStats || [], 5),
    recommendations: takeSample(report.recommendations || [], 3)
  };
}

export function summarizeNodeVitals(nodeVitals) {
  if (!nodeVitals || typeof nodeVitals !== 'object') return null;
  return {
    platform: nodeVitals.platform,
    nodeVersion: nodeVitals.nodeVersion,
    memory: nodeVitals.memory ? {
      rss: nodeVitals.memory.rss,
      heapUsed: nodeVitals.memory.heapUsed,
      heapTotal: nodeVitals.memory.heapTotal
    } : null,
    cpu: nodeVitals.cpu || null
  };
}
