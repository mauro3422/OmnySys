/**
 * Tier 2 Analyses - Barrel Export
 *
 * Responsabilidad:
 * - Exportar todos los análisis avanzados (Tier 2)
 */

export { detectSideEffectMarkers } from './side-effects.js';
export { analyzeReachability } from './reachability.js';
export { analyzeCoupling } from './coupling.js';
export { findUnresolvedImports } from './unresolved-imports.js';
export { findCircularImports } from './circular-imports.js';
export { findUnusedImports } from './unused-imports.js';
export { analyzeReexportChains } from './reexport-chains.js';
