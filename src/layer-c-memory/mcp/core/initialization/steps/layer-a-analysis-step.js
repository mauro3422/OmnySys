/**
 * @fileoverview layer-a-analysis-step.js
 *
 * Step 1: Run Layer A static analysis if needed
 *
 * @module mcp/core/initialization/steps/layer-a-analysis-step
 */

import { InitializationStep } from './base-step.js';
import { createLogger } from '../../../../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('OmnySys:layer:a:analysis:step');

/**
 * Ultra-fast check: if omnysys.db exists, analysis is complete.
 * Uses only fs.access on a known path — zero project tree scan, zero DB open.
 */
async function hasCompleteAnalysis(projectPath) {
  try {
    const dataDir = path.join(projectPath, '.omnysysdata');
    const dbPath = path.join(dataDir, 'omnysys.db');
    await fs.access(dbPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Step 1: Layer A Analysis
 * Runs first to determine what analysis is needed before starting LLM.
 */
export class LayerAAnalysisStep extends InitializationStep {
  constructor() {
    super('layer-a-analysis', { blocking: true, primaryOnly: true });
  }

  async execute(server) {
    const t0 = Date.now();
    logger.info('Layer A - Static Analysis');

    // ULTRA-FAST PATH: Check for omnysys.db BEFORE importing analysis-checker.js
    // (which triggers a full project tree scan via discoverProjectSourceFiles)
    const t1 = Date.now();
    const hasComplete = await hasCompleteAnalysis(server.projectPath);
    logger.info(`   ⏱️  hasCompleteAnalysis: ${Date.now() - t1}ms (result: ${hasComplete})`);

    if (hasComplete) {
      logger.info('   ✅ Complete analysis found — ultra-fast path (skip import + scan + DB)');

      const t2 = Date.now();
      if (server.reloadMetadata) {
        await server.reloadMetadata();
      }
      logger.info(`   ⏱️  reloadMetadata: ${Date.now() - t2}ms`);

      server.startupLayerAResult = {
        ran: false,
        strategy: 'load_only',
        filesAnalyzed: 0,
        filesChanged: 0,
        durationMs: 0,
        incremental: false
      };

      logger.info('   ✅ All files processed (LLM enrichment runs in background)');

      if (typeof global.gc === 'function') {
        global.gc();
        logger.info('  🧹 GC forced after Layer A — memory freed before LLM analysis');
      }

      logger.info(`   ⏱️  TOTAL Layer A fast path: ${Date.now() - t0}ms`);
      return true;
    }

    // SLOW PATH: No index.json — need full analysis check
    const { checkAndRunAnalysisSmart } = await import('../../analysis-checker.js');

    const result = await checkAndRunAnalysisSmart(server.projectPath, {
      orchestrator: server.orchestrator || null,
      reloadMetadataFn: () => server.reloadMetadata?.() || Promise.resolve()
    });

    server.startupLayerAResult = {
      ran: result.ran === true,
      strategy: result.strategy || null,
      filesAnalyzed: result.filesAnalyzed || 0,
      filesChanged: result.filesChanged || 0,
      durationMs: Math.round((result.duration || 0) * 1000),
      incremental: result.incremental === true
    };

    // Loguear resultado según la estrategia usada
    if (result.ran) {
      const strategyIcon = result.incremental ? '🔄' : '🚀';
      logger.info(`  ${strategyIcon} Analysis complete: ${result.strategy}`);
      logger.info(`     Files analyzed: ${result.filesAnalyzed}${result.filesChanged ? ` (${result.filesChanged} changed)` : ''}`);
      if (result.duration) {
        logger.info(`     Duration: ${result.duration.toFixed(2)}s`);
      }
    } else {
      logger.info(`  📦 Loaded existing analysis: ${result.filesAnalyzed} files (no changes)`);
    }

    // Forzar GC para liberar ASTs y estructuras de Layer A antes de iniciar LLM.
    // Layer A puede usar varios GB en parsedFiles/systemMap que deben liberarse ahora.
    if (typeof global.gc === 'function') {
      global.gc();
      logger.info('  🧹 GC forced after Layer A — memory freed before LLM analysis');
    }

    return true;
  }

  async rollback(server, error) {
    logger.info('  ℹ️  Layer A analysis is idempotent, no rollback needed');
  }
}

export default LayerAAnalysisStep;
