/**
 * @fileoverview Entry Point Detectors Index
 * 
 * Exporta todos los detectores de entry points
 * 
 * @module module-system/detectors
 * @phase 3
 */

export { findAPIRoutes } from './api-route-detector.js';
export { findCLICommands } from './cli-detector.js';
export { findEventHandlers } from './event-detector.js';
export { findScheduledJobs } from './job-detector.js';
export { findMainExports } from './export-detector.js';

/**
 * Encuentra todos los entry points del sistema
 * @param {Array} modules - Módulos del proyecto
 * @returns {Array} - Todos los entry points
 */
export function findAllEntryPoints(modules) {
  const entryPoints = [];
  
  entryPoints.push(...findAPIRoutes(modules));
  entryPoints.push(...findCLICommands(modules));
  entryPoints.push(...findEventHandlers(modules));
  entryPoints.push(...findScheduledJobs(modules));
  entryPoints.push(...findMainExports(modules));
  
  return entryPoints;
}
