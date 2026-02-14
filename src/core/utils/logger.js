/**
 * @fileoverview logger.js - Cable de conexión temporal
 * 
 * ⚠️  NOTA: Este archivo es un PUENTE temporal durante la refactorización.
 * El logger real está en src/utils/logger.js
 * 
 * Durante la auditoría sistemática (FASE X), este archivo será evaluado
 * para determinar si se mantiene o se elimina.
 * 
 * @module core/utils/logger
 */

// Re-export desde el logger central
export { Logger, createLogger, logger } from '../../utils/logger.js';
