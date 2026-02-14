/**
 * @fileoverview logger.js - Cable de conexión temporal (Layer C)
 * 
 * ⚠️  NOTA: Este archivo es un PUENTE temporal durante la refactorización.
 * El logger real está en src/utils/logger.js
 * 
 * @module layer-c-memory/utils/logger
 */

// Re-export desde el logger central
export { Logger, createLogger, logger } from '../../utils/logger.js';
