/**
 * @fileoverview Surface audit summary and status helpers.
 *
 * @module shared/compiler/surface-audit-summary
 */

import { compactSurfaceEntry, summarizeSurfaceMetrics } from './surface-audit-helpers.js';

export function summarizeSurfaceAudit(surfaceAudit = null) {
  if (!surfaceAudit || typeof surfaceAudit !== 'object') {
    return {
      generation: null,
      summary: {
        total: 0,
        fresh: 0,
        partial: 0,
        stale: 0,
        missing: 0,
        blocked: 0,
        trustworthy: false,
        nextAction: 'No surface audit data is available.',
        primaryIssue: null
      },
      metrics: summarizeSurfaceMetrics(),
      surfaces: [],
      details: null
    };
  }

  return {
    generation: surfaceAudit.generation || null,
    summary: surfaceAudit.summary || {
      total: 0,
      fresh: 0,
      partial: 0,
      stale: 0,
      missing: 0,
      blocked: 0,
      trustworthy: false,
      nextAction: 'No surface audit summary is available.',
      primaryIssue: null
    },
    metrics: surfaceAudit.metrics || summarizeSurfaceMetrics({
      databaseHealth: surfaceAudit.details?.databaseHealth,
      metadataExtractionCoverage: surfaceAudit.details?.metadataExtractionCoverage
    }),
    surfaces: Array.isArray(surfaceAudit.surfaces) ? surfaceAudit.surfaces.map(compactSurfaceEntry) : [],
    metadataExtractionCoverage: surfaceAudit.metadataExtractionCoverage || surfaceAudit.details?.metadataExtractionCoverage || null,
    details: surfaceAudit.details || null
  };
}

function sample(items = [], limit = 3) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit);
}

export function summarizeSurfaceAuditForStatus(surfaceAudit = null) {
  const summary = summarizeSurfaceAudit(surfaceAudit);
  const metadata = summary.metadataExtractionCoverage || null;

  return {
    generation: summary.generation ? {
      generationId: summary.generation.generationId,
      status: summary.generation.status,
      healthy: summary.generation.healthy,
      recommendation: summary.generation.recommendation
    } : null,
    summary: summary.summary ? {
      total: summary.summary.total,
      fresh: summary.summary.fresh,
      partial: summary.summary.partial,
      stale: summary.summary.stale,
      missing: summary.summary.missing,
      blocked: summary.summary.blocked,
      trustworthy: summary.summary.trustworthy,
      nextAction: summary.summary.nextAction,
      primaryIssue: summary.summary.primaryIssue
    } : null,
    metrics: summary.metrics ? {
      activeAtoms: summary.metrics.activeAtoms,
      activeFiles: summary.metrics.activeFiles,
      activeCallRelations: summary.metrics.activeCallRelations,
      activeSemanticConnections: summary.metrics.activeSemanticConnections,
      orphanCallRelations: summary.metrics.orphanCallRelations,
      activeSystemFiles: summary.metrics.activeSystemFiles,
      systemFilesWithSemantics: summary.metrics.systemFilesWithSemantics,
      metadataTables: summary.metrics.metadataTables,
      metadataRows: summary.metrics.metadataRows,
      metadataFields: summary.metrics.metadataFields,
      metadataCoveragePct: summary.metrics.metadataCoveragePct,
      metadataFieldCoveragePct: summary.metrics.metadataFieldCoveragePct
    } : null,
    surfaces: summary.surfaces.map((surface) => ({
      key: surface.key,
      label: surface.label,
      state: surface.state,
      healthy: surface.healthy,
      trustworthy: surface.trustworthy,
      sourceOfTruth: surface.sourceOfTruth,
      reason: surface.reason,
      counts: surface.counts || {}
    })),
    metadataExtractionCoverage: metadata ? {
      totalTables: metadata.summary?.totalTables || metadata.totalTables,
      totalRows: metadata.summary?.totalRows || metadata.totalRows,
      totalFields: metadata.summary?.totalFields || metadata.totalFields,
      coveredFields: metadata.summary?.coveredFields || metadata.coveredFields,
      emptyFields: metadata.summary?.emptyFields || metadata.emptyFields,
      partialFields: metadata.summary?.partialFields || metadata.partialFields,
      coveragePct: metadata.summary?.coveragePct || metadata.coveragePct,
      fieldCoveragePct: metadata.summary?.fieldCoveragePct || metadata.fieldCoveragePct,
      primaryIssue: metadata.primaryIssue,
      topMissingFields: sample(metadata.topMissingFields, 3),
      topCoveredFields: sample(metadata.topCoveredFields, 3)
    } : null
  };
}
