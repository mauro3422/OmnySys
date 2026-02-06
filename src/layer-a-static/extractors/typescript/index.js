/**
 * @fileoverview index.js
 * 
 * Facade del extractor TypeScript
 * 
 * @module extractors/typescript
 */

export { TS_EXTENSIONS, TSConstructType, TS_PATTERNS } from './constants.js';
export { extractInterfaces } from './extractors/interface-extractor.js';
export { extractTypes } from './extractors/type-extractor.js';
export { extractEnums } from './extractors/enum-extractor.js';

// Función principal
export function extractTypeScript(code) {
  return {
    interfaces: extractInterfaces(code),
    types: extractTypes(code),
    enums: extractEnums(code)
  };
}

export default { extractTypeScript };
