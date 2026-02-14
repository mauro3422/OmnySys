/**
 * @fileoverview Pipeline Enhancers - Post-procesamiento de metadatos
 * 
 * Los enhancers corren DESPUÉS de la extracción básica y enriquecen
 * los metadatos con conexiones adicionales, validaciones, etc.
 * 
 * No modifican la estructura base de los átomos, solo agregan campos adicionales
 * que las herramientas MCP pueden consumir opcionalmente.
 * 
 * @module pipeline/enhancers
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

// === Orchestrators (nueva API recomendada) ===
export { 
  runEnhancers, 
  runProjectEnhancers 
} from './orchestrators/index.js';

// === Builders ===
export { 
  buildSourceCodeMap, 
  readSourceFile, 
  getRelativePath 
} from './builders/index.js';

// === Analyzers ===
export { 
  collectSemanticIssues,
  detectHighCoupling,
  detectCriticalRisk
} from './analyzers/index.js';

// === Legacy (mantenido por compatibilidad) ===
export { 
  enhanceSystemMap,
  enrichSystemMap 
} from './legacy/index.js';

// === Individual Enhancers ===
export { enrichConnections } from './connection-enricher.js';
export { enhanceMetadata } from './metadata-enhancer.js';
