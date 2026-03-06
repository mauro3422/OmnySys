/**
 * @fileoverview static-insights.js
 *
 * Deriva insights de archivos DIRECTAMENTE desde datos de átomos,
 * sin usar LLM. Reemplaza el pipeline LLM de análisis de arquetipos.
 *
 * @module core/orchestrator/static-insights
 */

import path from 'path';
import { createLogger } from '../../utils/logger.js';
import { safeReadJson } from '#utils/json-safe.js';
import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';

// Nuevos módulos extraídos
import { deriveFileInsights as _deriveInsights } from './insight-derivator.js';
import { Phase2Indexer } from './phase2-indexer.js';

const logger = createLogger('OmnySys:static:insights');

/**
 * Deriva insights estáticos para un archivo desde sus átomos.
 * Delega en el módulo especializado InsightDerivator.
 */
export function deriveFileInsights(fileAnalysis, totalFiles = 1000) {
  return _deriveInsights(fileAnalysis, totalFiles);
}

/**
 * Reemplaza _analyzeComplexFilesWithLLM en el orchestrator.
 * Inicializa los procesos de enriquecimiento y el indexador de Fase 2.
 */
export async function _deriveStaticInsights() {
  logger.info('⚛️  Static insights mode — derived on-demand from atoms (no LLM)');

  try {
    const indexPath = path.join(this.OmnySysDataPath, 'index.json');
    const index = await safeReadJson(indexPath, { fileIndex: {} });
    let totalFiles = Object.keys(index?.fileIndex || {}).length;

    // SQLite-first projects can have empty/legacy index.json.
    // Fallback to cached metadata and then live DB count for an accurate startup stat.
    if (totalFiles === 0) {
      const metadata = this.cache?.get?.('metadata');
      totalFiles = metadata?.stats?.totalFiles || metadata?.totalFiles || 0;
    }

    if (totalFiles === 0) {
      try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(this.projectPath);
        if (repo?.db) {
          totalFiles = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as n FROM atoms').get()?.n || 0;
        }
      } catch {
        // Best effort fallback only.
      }
    }

    logger.info(`  ✅ ${totalFiles} files ready — insights derived on-demand`);

    // Emitir evento de completado
    this.emit?.('analysis:complete', {
      iterations: 0,
      totalFiles,
      source: 'static-atoms',
      issues: { stats: { totalIssues: 0 } }
    });

    // Iniciar el indexador de Fase 2 modular
    this._startPhase2BackgroundIndexer();

    // 🏘️ ANALYZE SOCIETIES (PUEBLOS)
    // Guard against duplicate startup runs in the same orchestrator lifecycle.
    if (!this._societyInitialPassTask) {
      this._societyInitialPassTask = (async () => {
        try {
          const { analyzeSocieties } = await import('#layer-b/society-manager/index.js');
          await analyzeSocieties(this.projectPath);
          logger.debug('Society analysis (Pueblos) initial pass complete');
          return true;
        } catch (e) {
          logger.debug('  ⚠️  Initial society analysis failed:', e.message);
          return false;
        }
      })();

      this._societyInitialPassTask.then((ok) => {
        if (!ok) this._societyInitialPassTask = null;
      });
    }

    // 📊 PERSIST GRAPH METRICS
    // Guard against duplicate scheduling/runs in the same orchestrator lifecycle.
    if (!this._graphMetricsPersistTask) {
      this._graphMetricsPersistTask = (async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const { persistGraphMetrics } = await import('#layer-c/storage/enrichment/index.js');
          await persistGraphMetrics(this.projectPath);
          logger.debug('Graph metrics persisted (centrality, propagation, risk_level)');
          return true;
        } catch (e) {
          logger.debug('  ⚠️  Graph metrics persistence failed:', e.message);
          return false;
        }
      })();

      this._graphMetricsPersistTask.then((ok) => {
        if (!ok) this._graphMetricsPersistTask = null;
      });
    }

  } catch (error) {
    logger.error('  ❌ Static insights init failed:', error.message);
  }
}

/**
 * On-demand prioritization: immediately deep-scan a file if Phase 2 is incomplete.
 */
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

    logger.debug(`⚡ On-demand Phase 2 for: ${relativeFilePath}`);

    const { analyzeProjectFilesUnified } = await import('#layer-a/pipeline/unified-analysis.js');

    const hr = new BaseSqlRepository(repo.db, 'StaticInsights:OnDemand');
    hr.delete('atoms', 'file_path', relativeFilePath);

    const absolutePath = path.join(this.projectPath, relativeFilePath);
    await analyzeProjectFilesUnified([absolutePath], this.projectPath, false, 'deep');

  } catch (e) {
    logger.debug(`[On-demand Phase 2] Error for ${relativeFilePath}: ${e.message}`);
  }
}

/**
 * Inicia el loop que procesa archivos en segundo plano.
 * Delega en la clase Phase2Indexer para manejar el ciclo de vida.
 */
export async function _startPhase2BackgroundIndexer() {
  if (this._phase2IndexerInstance) return;

  this._phase2IndexerInstance = new Phase2Indexer(this);
  await this._phase2IndexerInstance.start();
}
