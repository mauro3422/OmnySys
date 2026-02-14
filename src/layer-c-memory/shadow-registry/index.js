/**
 * @fileoverview Shadow Registry - Sistema de registro de sombras (átomos muertos)
 * 
 * Responsabilidad Única (SRP): Guardar y recuperar sombras de átomos borrados.
 * Mantiene el linaje evolutivo para "conexiones vibrantes".
 * 
 * SSOT: Única fuente de verdad para el historial de átomos.
 * 
 * @module layer-c-memory/shadow-registry
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

// === Core ===
export { 
  ShadowRegistry, 
  getShadowRegistry, 
  resetShadowRegistry 
} from './ShadowRegistry.js';

// === Storage ===
export { 
  ShadowStorage, 
  IndexManager 
} from './storage/index.js';

// === Cache ===
export { ShadowCache } from './cache/index.js';

// === DNA Helpers ===
export { 
  createFallbackDNA, 
  extractOrCreateDNA, 
  isValidDNA,
  getDNASummary 
} from './dna/index.js';

// === Search ===
export { 
  findSimilarShadows, 
  findBestMatch 
} from './search/index.js';

// === Ancestry ===
export { 
  createGenesisAncestry,
  createInheritedAncestry,
  enrichWithAncestry,
  calculateVibrationScore,
  reconstructFullLineage
} from './ancestry/index.js';

// === Types ===
export { ShadowStatus } from './types.js';

// === Legacy: clase principal como default ===
export { ShadowRegistry as default } from './ShadowRegistry.js';
