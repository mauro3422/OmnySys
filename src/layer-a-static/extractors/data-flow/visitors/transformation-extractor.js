/**
 * @fileoverview transformation-extractor.js
 * 
 * ⚠️  DEPRECATED: Este archivo se mantiene para backwards compatibility.
 * 
 * El TransformationExtractor ha sido refactorizado en el módulo:
 *   src/layer-a-static/extractors/data-flow/visitors/transformation-extractor/
 * 
 * Por favor usa la nueva ubicación:
 *   import { TransformationExtractor } from './transformation-extractor/index.js';
 * 
 * @deprecated Use transformation-extractor/index.js instead
 * @module extractors/data-flow/visitors/transformation-extractor
 */

// Re-export desde el nuevo módulo
export {
  TransformationExtractor,
  // Core
  classifyOperation,
  OPERATION_TYPES,
  extractSources,
  // Processors
  processStatement,
  processVariableDeclaration,
  processExpressionStatement,
  // Handlers
  handleDestructuring,
  handleMutatingCall,
  isMutatingMethod,
  // Utils
  getMemberPath,
  getCalleeName,
  getIdentifierName,
  findFunctionNode,
  // Version
  VERSION
} from './transformation-extractor/index.js';

// Export default para compatibilidad
import { TransformationExtractor } from './transformation-extractor/index.js';
export default TransformationExtractor;
