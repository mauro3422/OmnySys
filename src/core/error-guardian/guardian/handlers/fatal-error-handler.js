/**
 * @fileoverview Fatal Error Handler
 * 
 * Handles fatal errors with detailed logging and recovery
 * 
 * @module error-guardian/guardian/handlers/fatal-error-handler
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:error:fatal');

/**
 * Handle fatal error
 * @param {Object} error - Error object
 * @param {Object} analysis - Error analysis
 * @param {string} source - Error source
 * @param {Object} context - Additional context
 * @param {Object} deps - Dependencies (recovery, options)
 */
export async function handleFatalError(error, analysis, source, context, deps) {
  const { recovery, options, logError, stats } = deps;

  // LOW severity errors - just log quietly
  if (analysis.severity === 'LOW' || analysis.type === 'EPIPE') {
    logger.info(`ℹ️  ${analysis.type}: ${error.message || 'Unknown'} (${source}) - auto-handled`);
    await logError({
      timestamp: new Date().toISOString(),
      type: analysis.type,
      severity: analysis.severity,
      source,
      message: error.message,
      suggestion: analysis.suggestion,
      context
    });
    stats.prevented++;
    return;
  }

  // Display error banner for high severity
  displayErrorBanner(analysis, source, error);

  // Log error
  await logError({
    timestamp: new Date().toISOString(),
    type: analysis.type,
    severity: analysis.severity,
    source,
    message: error.message,
    stack: error.stack,
    suggestion: analysis.suggestion,
    context
  });

  // Attempt auto-fix if enabled
  await attemptAutoFix(analysis, options, recovery, stats);

  // Graceful recovery
  await recovery.recover(analysis);
  stats.prevented++;
}

/**
 * Display error banner
 */
function displayErrorBanner(analysis, source, error) {
  logger.error('═══════════════════════════════════════════════════');
  logger.error('🚨 ERROR FATAL CAPTURADO POR GUARDIÁN');
  logger.error('═══════════════════════════════════════════════════');
  logger.error(`Tipo: ${analysis.type}`);
  logger.error(`Severidad: ${analysis.severity}`);
  logger.error(`Fuente: ${source}`);
  logger.error(`Mensaje: ${error.message || 'Sin mensaje'}`);
  logger.error(`Sugerencia: ${analysis.suggestion}`);
  logger.error('───────────────────────────────────────────────────');

  if (analysis.commonFixes?.length > 0) {
    logger.error('💡 Soluciones posibles:');
    analysis.commonFixes.forEach((fix, i) => {
      logger.error(`   ${i + 1}. ${fix}`);
    });
  }

  logger.error('═══════════════════════════════════════════════════');
}

/**
 * Attempt auto-fix
 */
async function attemptAutoFix(analysis, options, recovery, stats) {
  if (analysis.autoFixable && options.enableAutoFix) {
    logger.info('🔧 Intentando auto-fix...');
    const fixed = await recovery.attemptAutoFix(analysis);
    if (fixed) {
      logger.info('✅ Auto-fix exitoso. Sistema estabilizado.');
      stats.autoFixed++;
    }
  } else if (analysis.autoFixable && !options.enableAutoFix) {
    logger.info('💡 Auto-fix available but DISABLED for safety.');
    logger.info('   To enable: new ErrorGuardian(path, { enableAutoFix: true })');
    logger.info('   Suggested fix:', analysis.suggestedFix || 'See logs for details');
  }
}
