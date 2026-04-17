/**
 * Tool: mcp_omnysystem_get_folderization_snapshot
 *
 * Returns a lightweight, DB-backed snapshot of folderization guidance,
 * naming debt and DB sync state without requiring the full compiler health
 * snapshot pipeline.
 */

import { createLogger } from '../../../utils/logger.js';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const logger = createLogger('OmnySys:folderization-snapshot');

function alignFolderizationResponse(result) {
  const topCandidate =
    result?.snapshot?.folderization?.candidateReport?.topCandidates?.[0]
    || result?.folderizationReport?.candidateReport?.topCandidates?.[0]
    || null;
  if (!topCandidate?.recommendedFolder) {
    return result;
  }

  const preferredFolder = topCandidate.recommendedFolder;
  const selectionReason = `Top folderization candidate from the DB is ${topCandidate.familyRoot} in ${topCandidate.directory}.`;
  const creationGuidance = {
    ...(result?.folderizationReport?.creationGuidance || {}),
    mode: 'create_folderized_family',
    matchedBy: 'candidateReport',
    familyDomain: topCandidate.directory || null,
    selectionReason,
    preferredFolder,
    preferredFamilyRoot: topCandidate.familyRoot || null,
    preferredDirectory: topCandidate.directory || null,
    guidance: `${selectionReason} Create the next file inside ${preferredFolder} using a short role basename such as ${(result?.folderizationReport?.creationGuidance?.preferredRoleStems || [])[0]?.stem || 'core.js'}.`
  };

  const summary = {
    ...(result?.summary || result?.snapshot?.summary || {}),
    recommendedTool: 'folderize_family',
    recommendedAction: `Folderize ${topCandidate.familyRoot} into ${preferredFolder} (confidence ${topCandidate.confidence}).`,
    nextBestFolder: preferredFolder,
    creationNextBestFolder: preferredFolder,
    whyThisFirst: selectionReason,
    folderizationTargetFolder: preferredFolder,
    folderizationTargetReason: selectionReason,
    creationGuidanceFolder: preferredFolder,
    creationGuidanceReason: selectionReason,
    summaryText: String(result?.summary?.summaryText || result?.snapshot?.summary?.summaryText || '')
      .replace(/target=[^|]+/, `target=${preferredFolder}`)
  };

  const folderizationReport = {
    ...result.folderizationReport,
    creationGuidance
  };

  const snapshot = result.snapshot
    ? {
        ...result.snapshot,
        folderization: {
          ...(result.snapshot.folderization || {}),
          creationGuidance
        },
        summary
      }
    : result.snapshot;

  return {
    ...result,
    folderizationReport,
    snapshot,
    summary,
    recommendedAction: summary.recommendedAction,
    nextBestFolder: summary.nextBestFolder,
    nextBestStem: summary.nextBestStem || result.nextBestStem || null,
    whyThisFirst: summary.whyThisFirst,
    guidance: creationGuidance
  };
}

export async function get_folderization_snapshot(args, context) {
  logger.info('[Tool] get_folderization_snapshot()');

  try {
    const serviceUrl = pathToFileURL(path.resolve(process.cwd(), 'src/layer-c-memory/mcp/tools/folderization-snapshot-service.js'));
    serviceUrl.searchParams.set('rev', randomUUID());
    serviceUrl.searchParams.set('call', `${Date.now()}`);
    const { buildFolderizationSnapshotContext } = await import(serviceUrl.href);
    const result = await buildFolderizationSnapshotContext(args, context, {
      captureSource: 'mcp.tool.get_folderization_snapshot',
      snapshotKind: args?.snapshotKind || 'folderization',
      persist: false
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Project repository unavailable'
      };
    }

    const aligned = alignFolderizationResponse(result);
    if (args?.persist !== false && result?.repo?.db?.prepare) {
      const persistUrl = pathToFileURL(path.resolve(process.cwd(), 'src/layer-c-memory/mcp/tools/folderization-snapshot/index.js'));
      persistUrl.searchParams.set('rev', randomUUID());
      persistUrl.searchParams.set('call', `${Date.now()}`);
      const { persistFolderizationSnapshot } = await import(persistUrl.href);
      persistFolderizationSnapshot(result.repo.db, aligned.snapshot);
    }

    return {
      success: true,
      aggregationType: 'folderization_snapshot',
      snapshot: aligned.snapshot,
      history: aligned.history,
      trend: aligned.trend,
      folderization: aligned.folderizationReport,
      recommendedAction: aligned.recommendedAction || aligned.snapshot?.summary?.recommendedAction || null,
      nextBestFolder: aligned.nextBestFolder || aligned.snapshot?.summary?.nextBestFolder || null,
      nextBestStem: aligned.nextBestStem || aligned.snapshot?.summary?.nextBestStem || null,
      whyThisFirst: aligned.whyThisFirst || aligned.snapshot?.summary?.whyThisFirst || null,
      databaseHealth: aligned.databaseHealth ? {
        healthy: aligned.databaseHealth.healthy === true,
        healthScore: Number(aligned.databaseHealth.healthScore || 0),
        healthGrade: aligned.databaseHealth.grade || 'F',
        summary: aligned.databaseHealth.summary || null,
        metrics: aligned.databaseHealth.metrics || null,
        criticalFindings: aligned.databaseHealth.criticalFindings || [],
        warnings: aligned.databaseHealth.warnings || [],
        recommendations: aligned.databaseHealth.recommendations || []
      } : null,
      summary: aligned.summary,
      oneLine: aligned.summary.summaryText,
      guidance: aligned.folderizationReport?.creationGuidance || null
    };
  } catch (error) {
    logger.error(`[Tool] get_folderization_snapshot failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_folderization_snapshot };
