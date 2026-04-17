import { normalizeCount } from '../contract-helpers.js';
import { buildUpdateSurfaceSummary } from '../update-surface-summary.js';
import {
  compactWatcherSummary,
  compactToolInventory,
  resolveControlPlaneContracts,
  resolvePolicyCoverageSummary
} from '../status-summary/index.js';

export function extractStatusContext(status = {}) {
  const databaseHealth = status.databaseHealth || {};
  const metricsSnapshot = status.metricsSnapshot || {};
  const current = metricsSnapshot.current || {};
  const daily = metricsSnapshot.daily || null;
  const lifetime = metricsSnapshot.lifetime || null;
  const mcpSessions = {
    ...(status.background?.mcpSessionSummary || {}),
    ...(status.mcpSessions || {}),
    requestDeliverySummary: status.requestDeliverySummary || status.background?.mcpRequestDeliverySummary || null,
    topologySummary: status.topologySummary || status.background?.mcpTopologySummary || null
  };
  const watcher = compactWatcherSummary(status.watcher) || {};
  const toolInventory = compactToolInventory(status.toolInventory) || {};
  const recentErrorSummary = status.recentErrors?.summary || {};
  const updateSurface = buildUpdateSurfaceSummary(status);
  const propagationExpansion = status.compilerExplainability?.driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')
    || (status.compilerExplainability?.driftAssessment?.primaryIssue?.key === 'propagation_expansion' ? status.compilerExplainability.driftAssessment.primaryIssue : null);
  const propagationLedger = status.propagationLedger || status.metricsSnapshot?.current?.propagationLedger || null;
  const controlPlaneContracts = resolveControlPlaneContracts(status);
  const policyCoverage = controlPlaneContracts.policyCoverage || resolvePolicyCoverageSummary(status);
  const metricAlignment = controlPlaneContracts.metricAlignment || status.metricAlignment || null;
  const folderizationAutomation = controlPlaneContracts.folderizationAutomation || status.compilerExplainability?.folderization?.automation || null;
  const folderizationAdoption = controlPlaneContracts.folderizationAdoption
    || folderizationAutomation?.propagationAdoption
    || status.compilerExplainability?.folderization?.automation?.propagationAdoption
    || null;
  const namingDrift = status.compilerExplainability?.folderization?.summary
    ? {
        state: status.compilerExplainability.folderization.summary.namingDriftState || 'fresh',
        score: status.compilerExplainability.folderization.summary.namingDriftScore || 0,
        reason: status.compilerExplainability.folderization.summary.namingDriftReason || null,
        recommendation: status.compilerExplainability.folderization.summary.namingDriftRecommendation || null,
        evidence: status.compilerExplainability.folderization.summary.namingDriftEvidence || null
      }
    : null;
  const historyStores = controlPlaneContracts.historyStores || status.compilerExplainability?.systemInventory?.historyStores || status.compilerExplainability?.systemInventory?.summary?.historyStores || null;
  const structuralGroups = normalizeCount(current.structuralGroups);
  const conceptualGroups = normalizeCount(current.conceptualGroups);
  const totalDuplicates = structuralGroups + conceptualGroups;
  const healthGrade = databaseHealth.grade || current.healthGrade || 'F';
  const healthScore = normalizeCount(databaseHealth.healthScore || current.healthScore);

  return {
    status, databaseHealth, metricsSnapshot, current, daily, lifetime,
    mcpSessions, watcher, toolInventory, recentErrorSummary, updateSurface,
    propagationExpansion, controlPlaneContracts, policyCoverage,
    folderizationAutomation, folderizationAdoption, namingDrift, historyStores, propagationLedger,
    structuralGroups, conceptualGroups, totalDuplicates, healthGrade, healthScore,
    metricAlignment
  };
}

function normalizeCell(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function renderSystemTableAscii(table = null) {
  if (!table || !Array.isArray(table.rows) || table.rows.length === 0) {
    return 'Control Plane\n(no rows)';
  }

  const headers = ['Area', 'State', 'Detail', 'Source'];
  const rows = table.rows.map((row) => [
    normalizeCell(row.area),
    normalizeCell(row.state),
    normalizeCell(row.detail),
    normalizeCell(row.source)
  ]);
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => row[index].length)));
  const border = `+${widths.map((width) => '-'.repeat(width + 2)).join('+')}+`;
  const renderRow = (cells) => `| ${cells.map((cell, index) => cell.padEnd(widths[index], ' ')).join(' | ')} |`;

  return ['Control Plane', border, renderRow(headers), border, ...rows.map(renderRow), border].join('\n');
}
