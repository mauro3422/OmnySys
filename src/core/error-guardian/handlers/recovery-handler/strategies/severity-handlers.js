/**
 * @fileoverview Severity Handlers
 * 
 * Estrategias de manejo por nivel de severidad.
 * 
 * @module core/error-guardian/handlers/recovery-handler/strategies/severity-handlers
 */

import { createLogger } from '../../../../utils/logger.js';
import { restartEssentialComponents } from '../actions/component-actions.js';
import { isolateAffectedComponent } from '../actions/isolation.js';

const logger = createLogger('OmnySys:error:recovery');

/**
 * Handle CRITICAL severity errors
 * @param {RecoveryHandler} handler - Recovery handler instance
 * @param {Object} analysis - Error analysis
 * @returns {Promise<boolean>}
 */
export async function handleCritical(handler, analysis) {
  logger.error('💥 Error CRITICAL. Reiniciando componentes esenciales...');
  
  await restartEssentialComponents(handler.projectPath, handler.stats);
  await handler.executeCallback('CRITICAL', analysis);
  
  return true;
}

/**
 * Handle HIGH severity errors
 * @param {RecoveryHandler} handler - Recovery handler instance
 * @param {Object} analysis - Error analysis
 * @returns {Promise<boolean>}
 */
export async function handleHigh(handler, analysis) {
  logger.warn('⚠️  Error HIGH. Aislando componente afectado...');
  
  await isolateAffectedComponent(analysis, handler.stats);
  await handler.executeCallback('HIGH', analysis);
  
  return true;
}

/**
 * Handle MEDIUM severity errors
 * @param {RecoveryHandler} handler - Recovery handler instance
 * @param {Object} analysis - Error analysis
 * @returns {Promise<boolean>}
 */
export async function handleMedium(handler, analysis) {
  logger.info('ℹ️  Error MEDIUM. Continuando con precaución...');
  
  await handler.executeCallback('MEDIUM', analysis);
  
  return true;
}

/**
 * Handle LOW severity errors
 * @param {RecoveryHandler} handler - Recovery handler instance
 * @param {Object} analysis - Error analysis
 * @returns {Promise<boolean>}
 */
export async function handleLow(handler, analysis) {
  // Low severity - just log quietly, no action needed
  logger.debug(`Low severity error handled: ${analysis.type}`);
  return true;
}

/**
 * Handle unknown severity errors
 * @param {RecoveryHandler} handler - Recovery handler instance
 * @param {Object} analysis - Error analysis
 * @returns {Promise<boolean>}
 */
export async function handleUnknown(handler, analysis) {
  logger.warn(`Unknown severity, treating as MEDIUM: ${analysis.type}`);
  return handleMedium(handler, analysis);
}
