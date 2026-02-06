/**
 * query-service.js
 * 
 * ⚠️ DEPRECATED: Este archivo es un re-export para backward compatibility.
 * 
 * El código se ha movido a:
 *   src/layer-a-static/query/
 * 
 * Nueva estructura:
 *   - readers/
 *     - json-reader.js         - Lectura segura de JSON
 *   - queries/
 *     - project-query.js       - Consultas de proyecto
 *     - file-query.js          - Consultas de archivo
 *     - dependency-query.js    - Consultas de dependencias
 *   - index.js                 - Facade API pública
 * 
 * @deprecated Use `import { ... } from '../query/index.js'` instead
 */

console.warn('⚠️  DEPRECATED: Importing from storage/query-service.js');
console.warn('   Please update imports to: query/index.js');

export * from '../query/index.js';
