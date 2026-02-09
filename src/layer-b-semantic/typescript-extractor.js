/**
 * typescript-extractor.js
 * 
 * RE-EXPORT from layer-a-static/extractors/
 * 
 * Este archivo existe para backwards compatibility.
 * La implementación ha sido movida a layer-a-static/extractors/
 * siguiendo la regla de arquitectura: Layer A no depende de Layer B.
 * 
 * @deprecated Use src/layer-a-static/extractors/typescript-extractor.js
 * @module layer-b-semantic/typescript-extractor
 */

export {
  extractTypeScriptDefinitions,
  detectInterfaceImplementations,
  detectInterfaceExtensions,
  detectTypeUsages,
  detectPotentialBreakingChanges,
  extractTypeScriptFromFile,
  detectAllTypeScriptConnections
} from '../layer-a-static/extractors/typescript-extractor.js';
