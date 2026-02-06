/**
 * @fileoverview index.js
 * 
 * Facade del contrato de metadatos
 * 
 * @module metadata-contract
 */

// Constantes
export {
  REQUIRED_METADATA_FIELDS,
  OPTIONAL_METADATA_FIELDS,
  ALL_METADATA_FIELDS,
  ARCHITECTURAL_THRESHOLDS,
  ARRAY_LIMITS,
  TYPESCRIPT_EXTENSIONS,
  SINGLETON_INDICATORS
} from './constants.js';

// Schemas
export { createEmptyMetadata, isLayerAMetadata } from './schemas/index.js';

// Validadores
export { validateMetadata, validateField, hasRequiredFields } from './validators/index.js';

// Builders
export { buildStandardMetadata, buildPromptMetadata } from './builders/index.js';

// Detectores
export {
  detectGodObject,
  detectOrphanModule,
  detectPatterns,
  getPatternDescriptions
} from './detectors/index.js';

// Import para default export
import { REQUIRED_METADATA_FIELDS, OPTIONAL_METADATA_FIELDS, ARCHITECTURAL_THRESHOLDS } from './constants.js';
import { validateMetadata } from './validators/index.js';
import { buildStandardMetadata, buildPromptMetadata } from './builders/index.js';
import { detectGodObject, detectOrphanModule } from './detectors/index.js';

// Default export
export default {
  REQUIRED_METADATA_FIELDS,
  OPTIONAL_METADATA_FIELDS,
  validateMetadata,
  buildStandardMetadata,
  buildPromptMetadata,
  detectGodObject,
  detectOrphanModule,
  ARCHITECTURAL_THRESHOLDS
};
