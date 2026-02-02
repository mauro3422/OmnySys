/**
 * Tier 3 Analyses - Barrel Export
 *
 * Responsabilidad:
 * - Exportar todos los análisis profundos (Tier 3)
 * - Deep static analysis: types, constants, enums, objects
 */

export { analyzeTypeUsage } from './type-usage.js';
export { analyzeConstantUsage } from './constant-usage.js';
export { analyzeSharedObjects } from './object-tracking.js';
export { analyzeEnumUsage } from './enum-usage.js';
