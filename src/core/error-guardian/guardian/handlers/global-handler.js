/**
 * @fileoverview Global Error Handlers
 * 
 * Setup global process error handlers
 * 
 * @module error-guardian/guardian/handlers/global-handler
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:error:guardian');

/**
 * Setup global error handlers
 * @param {Function} fatalHandler - Fatal error handler
 * @param {Function} warningHandler - Warning handler
 */
export function setupGlobalHandlers(fatalHandler, warningHandler) {
  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    fatalHandler(error, 'uncaughtException');
  });

  // Unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    fatalHandler(reason, 'unhandledRejection', { promise });
  });

  // Warnings
  process.on('warning', (warning) => {
    warningHandler(warning);
  });

  logger.info('🛡️  Error Guardian activado - Sistema protegido recursivamente');
}

/**
 * Handle warning
 * @param {Error} warning - Warning object
 */
export function handleWarning(warning) {
  logger.warn('⚠️  Warning detectado:', warning.message);
}
