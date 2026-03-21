/**
 * @fileoverview static-insights.js
 *
 * Derives insights from atom data directly, without LLM usage.
 *
 * @module core/orchestrator/static-insights
 */

import path from 'path';
import { createLogger } from '../../utils/logger.js';
import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';

import { deriveFileInsights as _deriveInsights } from './insight-derivator.js';
import { Phase2Indexer } from './phase2-indexer.js';
import {
  buildStaticInsightsGeneration,
  resolveStaticInsightsTotalFiles,
  scheduleStaticInsightsPostStartupTasks
} from './static-insights-helpers.js';

const logger = createLogger('OmnySys:static:insights');

export function deriveFileInsights(fileAnalysis, totalFiles = 1000) {
  return _deriveInsights(fileAnalysis, totalFiles);
}

export async function _deriveStaticInsights() {
  logger.info('Static insights mode - derived on-demand from atoms (no LLM)');

  try {
    const totalFiles = await resolveStaticInsightsTotalFiles(this);
    const { generation, derivedFeatureRegistry } = buildStaticInsightsGeneration(this, totalFiles);

    this._analysisGeneration = generation;
    this._derivedFeatureRegistry = derivedFeatureRegistry;

    logger.info(`  ✅ ${totalFiles} files ready - insights derived on-demand`);

    this.emit?.('analysis:complete', {
      iterations: 0,
      totalFiles,
      source: 'static-atoms',
      generation,
      derivedFeatures: derivedFeatureRegistry.summary,
      issues: { stats: { totalIssues: 0 } }
    });
    this.emit?.('analysis:generation', generation);

    this._startPhase2BackgroundIndexer();
    await scheduleStaticInsightsPostStartupTasks(this, logger);
  } catch (error) {
    logger.error('Static insights init failed:', error.message);
  }
}

export async function _prioritizeFileForPhase2(relativeFilePath) {
  if (!relativeFilePath) return;

  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(this.projectPath);
    if (!repo || !repo.db) return;

    const pending = repo.db.prepare(
      `SELECT COUNT(*) as count FROM atoms WHERE file_path = ? AND is_phase2_complete = 0`
    ).get(relativeFilePath);

    if (!pending || pending.count === 0) return;

    logger.debug(`On-demand Phase 2 for: ${relativeFilePath}`);

    const { analyzeProjectFilesUnified } = await import('#layer-a/pipeline/unified-analysis.js');

    const hr = new BaseSqlRepository(repo.db, 'StaticInsights:OnDemand');
    hr.delete('atoms', 'file_path', relativeFilePath);

    const absolutePath = path.join(this.projectPath, relativeFilePath);
    await analyzeProjectFilesUnified([absolutePath], this.projectPath, false, 'deep');
  } catch (error) {
    logger.debug(`[On-demand Phase 2] Error for ${relativeFilePath}: ${error.message}`);
  }
}

export async function _startPhase2BackgroundIndexer() {
  if (this._phase2IndexerInstance) return;

  this._phase2IndexerInstance = new Phase2Indexer(this);
  await this._phase2IndexerInstance.start();
}
