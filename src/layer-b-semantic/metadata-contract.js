/**
 * metadata-contract.js
 * 
 * ⚠️ DEPRECATED: Este archivo es un re-export para backward compatibility.
 * 
 * El código se ha movido a:
 *   src/layer-b-semantic/metadata-contract/
 * 
 * Nueva estructura:
 *   - constants.js                - SSOT: campos, umbrales, límites
 *   - schemas/
 *     - layer-a-metadata.js       - Definición del schema
 *   - validators/
 *     - metadata-validator.js     - Validación de metadatos
 *   - builders/
 *     - standard-builder.js       - buildStandardMetadata
 *     - prompt-builder.js         - buildPromptMetadata
 *   - detectors/
 *     - architectural-patterns.js - detectGodObject, detectOrphanModule
 *   - index.js                    - Facade API pública
 * 
 * @deprecated Use `import { ... } from './metadata-contract/index.js'` instead
 */

console.warn('⚠️  DEPRECATED: Importing from metadata-contract.js');
console.warn('   Please update imports to: metadata-contract/index.js');

export * from './metadata-contract/index.js';
