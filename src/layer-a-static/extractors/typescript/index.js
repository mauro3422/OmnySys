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

// 🆕 NUEVO: Wrapper para comprehensive-extractor
export function extractTypeReferences(code) {
  // Extraer referencias a tipos en el código
  const typeRefs = [];
  const patterns = [
    /:\s*([A-Z][a-zA-Z0-9_]*)/g,  // : TypeName
    /<([A-Z][a-zA-Z0-9_]*)>/g,    // <TypeName>
    /as\s+([A-Z][a-zA-Z0-9_]*)/g   // as TypeName
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      typeRefs.push(match[1]);
    }
  }
  
  return [...new Set(typeRefs)];
}

// Función principal
export function extractTypeScript(code) {
  return {
    interfaces: extractInterfaces(code),
    types: extractTypes(code),
    enums: extractEnums(code)
  };
}

export default { extractTypeScript };
