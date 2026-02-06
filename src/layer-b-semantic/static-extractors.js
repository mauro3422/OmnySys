/**
 * Re-exports para compatibilidad temporal
 * 
 * ⚠️ DEPRECATED: Estos extractores se movieron a layer-a-static/extractors/
 * Este archivo existe solo para mantener compatibilidad con código legacy.
 * 
 * Los extractores estáticos ahora viven en:
 *   src/layer-a-static/extractors/
 * 
 * TODO: Actualizar todos los imports para apuntar directamente a layer-a-static
 * y eliminar este archivo.
 */

console.warn('⚠️  DEPRECATED: Importing from layer-b-semantic/static-extractors.js');
console.warn('   Please update imports to: layer-a-static/extractors/static-extractors.js');

export * from '../layer-a-static/extractors/static-extractors.js';
