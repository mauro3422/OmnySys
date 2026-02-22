/**
 * @fileoverview layer-a-analysis-step.js
 *
 * Step 1: Run Layer A static analysis if needed
 * 
 * Now runs BEFORE LLM setup so we can determine if LLM is actually needed.
 * This is the correct order: Layer A determines requirements, then we start LLM if needed.
 *
 * @module mcp/core/initialization/steps/layer-a-analysis-step
 */

import { InitializationStep } from './base-step.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:layer:a:analysis:step');



/**
 * Step 1: Layer A Analysis
 * Runs first to determine what analysis is needed before starting LLM.
 */
export class LayerAAnalysisStep extends InitializationStep {
  constructor() {
    super('layer-a-analysis', { blocking: true });
  }

  shouldExecute(server) {
    // LIGHT mode skips Layer A analysis — PRIMARY handles it
    return server.isPrimary !== false;
  }

  async execute(server) {
    logger.info('Layer A - Static Analysis');

    // 🆕 Usar análisis inteligente con estrategias optimizadas
    const { checkAndRunAnalysisSmart } = await import('../../analysis-checker.js');
    
    const result = await checkAndRunAnalysisSmart(server.projectPath, {
      orchestrator: server.orchestrator || null,
      reloadMetadataFn: () => server.reloadMetadata?.() || Promise.resolve()
    });

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
