/**
 * @fileoverview layer-a-analysis-step.js
 *
 * Step 1: Run Layer A static analysis if needed
 *
 * @module mcp/core/initialization/steps/layer-a-analysis-step
 */

import { InitializationStep } from './base-step.js';
import { createLogger } from '../../../../../utils/logger.js';
import { discoverProjectSourceFiles } from '../../../../../shared/compiler/index.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('OmnySys:layer:a:analysis:step');

/**
 * Ultra-fast check: if omnysys.db exists AND has active atoms, analysis is complete.
 * Uses only fs.access + a quick SQLite count — zero project tree scan.
 * Minimum threshold: 100 active atoms (a real project has thousands).
 */
const MIN_ACTIVE_ATOMS_THRESHOLD = 100;
const MIN_INDEX_COVERAGE_RATIO = 0.98;

async function hasCompleteAnalysis(projectPath) {
  try {
    const dataDir = path.join(projectPath, '.omnysysdata');
    const dbPath = path.join(dataDir, 'omnysys.db');
    await fs.access(dbPath);

    // DB exists — quick check: does it have active atoms?
    // After reanalyze=true, the DB is recreated empty → must run full analysis
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });

    try {
      const row = db.prepare('SELECT COUNT(*) as n FROM atoms WHERE is_removed = 0').get();
      const activeCount = Number(row?.n || 0);
      if (activeCount < MIN_ACTIVE_ATOMS_THRESHOLD) {
        db.close();
        return false;
      }

      const fileRow = db.prepare('SELECT COUNT(*) as n FROM files WHERE is_removed = 0').get();
      const indexedFileCount = Number(fileRow?.n || 0);

      let discoveredFileCount = 0;
      try {
        discoveredFileCount = (await discoverProjectSourceFiles(projectPath)).length;
      } catch {
        db.close();
        return false;
      }

      db.close();

      if (discoveredFileCount <= 0) {
        return false;
      }

      const coverageRatio = indexedFileCount / discoveredFileCount;
      if (coverageRatio < MIN_INDEX_COVERAGE_RATIO) {
        logger.warn(
          `   ⚠️  Analysis coverage too small for fast path: ${indexedFileCount}/${discoveredFileCount} files (${Math.round(coverageRatio * 100)}%)`
        );
        return false;
      }

      return true;
    } catch {
      db.close();
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Log result of a full analysis run.
 */
function logAnalysisResult(result) {
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
}

/**
 * Build the startupLayerAResult object from analysis output.
 */
function buildLayerAResult(result) {
  return {
    ran: result.ran === true,
    strategy: result.strategy || null,
    filesAnalyzed: result.filesAnalyzed || 0,
    filesChanged: result.filesChanged || 0,
    durationMs: Math.round((result.duration || 0) * 1000),
    incremental: result.incremental === true
  };
}

/**
 * Build a fast-path result (no analysis needed).
 */
function buildFastPathResult() {
  return {
    ran: false,
    strategy: 'load_only',
    filesAnalyzed: 0,
    filesChanged: 0,
    durationMs: 0,
    incremental: false
  };
}

/**
 * Run the full analysis via analysis.
 */
async function runFullAnalysis(projectPath, server) {
  const { checkAndRunAnalysisSmart } = await import('../../analysis.js');
  return checkAndRunAnalysisSmart(projectPath, {
    orchestrator: server.orchestrator || null,
    reloadMetadataFn: () => server.reloadMetadata?.() || Promise.resolve()
  });
}

/**
 * Force GC if available.
 */
function forceGC() {
  if (typeof global.gc === 'function') {
    global.gc();
    logger.info('  🧹 GC forced — memory freed before LLM analysis');
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

      server.startupLayerAResult = buildFastPathResult();
      logger.info('   ✅ All files processed (LLM enrichment runs in background)');

      forceGC();
      logger.info(`   ⏱️  TOTAL Layer A fast path: ${Date.now() - t0}ms`);
      return true;
    }

    // SLOW PATH: No omnysys.db — need full analysis check
    const result = await runFullAnalysis(server.projectPath, server);
    server.startupLayerAResult = buildLayerAResult(result);
    logAnalysisResult(result);

    forceGC();
    return true;
  }

  async rollback(server, error) {
    logger.info('  ℹ️  Layer A analysis is idempotent, no rollback needed');
  }
}

export default LayerAAnalysisStep;
