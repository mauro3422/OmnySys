/**
 * @fileoverview index.js
 * 
 * ❌ DEPRECATED AND REMOVED
 * 
 * Este archivo fue parte de un facade monolítico que exportaba todas las queries.
 * Ha sido eliminado en favor de APIs especializadas.
 * 
 * 🆕 USAR EN SU LUGAR:
 *   - `#layer-a/query/apis/project-api.js` - Metadata y estadísticas
 *   - `#layer-a/query/apis/file-api.js` - Análisis de archivos y átomos
 *   - `#layer-a/query/apis/dependency-api.js` - Grafos de dependencias  
 *   - `#layer-a/query/apis/connections-api.js` - Conexiones semánticas
 *   - `#layer-a/query/apis/risk-api.js` - Evaluación de riesgos
 *   - `#layer-a/query/apis/export-api.js` - Exportación de datos
 * 
 * @deprecated Use `#layer-a/query/apis/*` instead
 * @module query
 * @throws {Error} Always throws with migration instructions
 */

throw new Error(
  '\n❌ ERROR: query/index.js ha sido eliminado.\n\n' +
  '🆕 Usar las APIs especializadas:\n' +
  '  - #layer-a/query/apis/project-api.js\n' +
  '  - #layer-a/query/apis/file-api.js\n' +
  '  - #layer-a/query/apis/dependency-api.js\n' +
  '  - #layer-a/query/apis/connections-api.js\n' +
  '  - #layer-a/query/apis/risk-api.js\n' +
  '  - #layer-a/query/apis/export-api.js\n\n' +
  '📖 Ver: EXTRAPOLACION_OMNYSYS.md\n'
);
