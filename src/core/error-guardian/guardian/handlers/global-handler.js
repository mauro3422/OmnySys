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

  let isHandlingRejection = false;
  process.on('unhandledRejection', (reason, promise) => {
    try {
      const fs = require('fs');
      if (reason && reason.stack) {
        fs.appendFileSync('C:\\Dev\\OmnySystem\\crash-trace.txt', new Date().toISOString() + '\\n' + reason.stack + '\\n\\n');
      } else {
        fs.appendFileSync('C:\\Dev\\OmnySystem\\crash-trace.txt', new Date().toISOString() + '\\n' + String(reason) + '\\n\\n');
      }
    } catch (e) {
      // Ignore sync write errors
    }

    if (isHandlingRejection) {
      console.error('CRITICAL: unhandledRejection during fatal handler execution', reason);
      return;
    }
    isHandlingRejection = true;
    try {
      const result = fatalHandler(reason, 'unhandledRejection', { promise });
      if (result && typeof result.catch === 'function') {
        result.catch(err => console.error('CRITICAL: fatal handler failed async', err))
          .finally(() => { isHandlingRejection = false; });
      } else {
        isHandlingRejection = false;
      }
    } catch (err) {
      console.error('CRITICAL: fatal handler failed sync', err);
      isHandlingRejection = false;
    }
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
