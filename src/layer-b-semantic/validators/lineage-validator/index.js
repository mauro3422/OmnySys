/**
 * @fileoverview Lineage Validator - Valida que los metadatos tengan sentido para lineage
 * 
 * SSOT: Única fuente de validación de metadatos para Shadow Registry.
 * Garantiza que solo metadatos válidos y coherentes entren al sistema.
 * 
 * @module layer-b-semantic/validators/lineage-validator
 */

export { validateForLineage } from './validators/main-validator.js';
export { validateDataFlow } from './checks/dataflow-checks.js';
export { validateCoherence } from './checks/coherence-checks.js';
export { validateSemantic } from './checks/semantic-checks.js';
export { validateShadow, validateMatch } from './checks/shadow-checks.js';
export { calculateConfidence } from './utils/confidence.js';
export { extractMetadata } from './utils/metadata-extractor.js';
