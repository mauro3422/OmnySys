/**
 * @fileoverview Helpers for static insights startup orchestration.
 *
 * Separates file-count resolution, generation publication and startup task
 * scheduling from the orchestrator coordinator.
 *
 * @module core/orchestrator/static-insights-helpers
 */

import path from 'path';
import { safeReadJson } from '#utils/json-safe.js';
import {
  buildAnalysisGenerationSnapshot,
  buildDerivedFeatureRegistry,
  getPhase2FileCounts
} from '#shared/compiler/index.js';

export async function resolveStaticInsightsTotalFiles(orchestrator) {
  const indexPath = path.join(orchestrator.OmnySysDataPath, 'index.json');
  const index = await safeReadJson(indexPath, { fileIndex: {} });
  let totalFiles = Object.keys(index?.fileIndex || {}).length;

  if (totalFiles === 0) {
    const metadata = orchestrator.cache?.get?.('metadata');
    totalFiles = metadata?.stats?.totalFiles || metadata?.totalFiles || 0;
  }

  if (totalFiles === 0) {
    try {
      const { getRepository } = await import('#layer-c/storage/repository/index.js');
      const repo = getRepository(orchestrator.projectPath);
      if (repo?.db) {
        totalFiles = getPhase2FileCounts(repo.db).liveFileCount;
      }
    } catch {
      // Best effort fallback only.
    }
  }

  return totalFiles;
}

export function buildStaticInsightsGeneration(orchestrator, totalFiles) {
  const derivedFeatureRegistry = buildDerivedFeatureRegistry();
  const metadata = orchestrator.cache?.get?.('metadata') || {};
  const atomCount = metadata?.stats?.totalAtoms || metadata?.totalAtoms || 0;
  const relationCount = metadata?.stats?.totalRelations || metadata?.totalRelations || 0;
  const semanticConnectionCount = metadata?.stats?.totalSemanticConnections || metadata?.totalSemanticConnections || 0;

  const generation = buildAnalysisGenerationSnapshot({
    projectPath: orchestrator.projectPath,
    source: 'static-atoms',
    phase: 'startup',
    totalFiles,
    atomCount,
    relationCount,
    semanticConnectionCount,
    previousGeneration: orchestrator._analysisGeneration,
    derivedFeatureRegistry
  });

  return {
    generation,
    derivedFeatureRegistry
  };
}

export async function scheduleStaticInsightsPostStartupTasks(orchestrator, logger) {
  if (!orchestrator._societyInitialPassTask) {
    orchestrator._societyInitialPassTask = (async () => {
      try {
        const { analyzeSocieties } = await import('#layer-b/society-manager/index.js');
        await analyzeSocieties(orchestrator.projectPath);
        logger.debug('Society analysis (Pueblos) initial pass complete');
        return true;
      } catch (error) {
        logger.debug(`  ⚠️  Initial society analysis failed: ${error.message}`);
        return false;
      }
    })();

    orchestrator._societyInitialPassTask.then((ok) => {
      if (!ok) orchestrator._societyInitialPassTask = null;
    });
  }

  if (!orchestrator._graphMetricsPersistTask) {
    orchestrator._graphMetricsPersistTask = (async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const { persistGraphMetrics } = await import('#layer-c/storage/enrichment/index.js');
        await persistGraphMetrics(orchestrator.projectPath);
        logger.debug('Graph metrics persisted (centrality, propagation, risk_level)');
        return true;
      } catch (error) {
        logger.debug(`  ⚠️  Graph metrics persistence failed: ${error.message}`);
        return false;
      }
    })();

    orchestrator._graphMetricsPersistTask.then((ok) => {
      if (!ok) orchestrator._graphMetricsPersistTask = null;
    });
  }
}
