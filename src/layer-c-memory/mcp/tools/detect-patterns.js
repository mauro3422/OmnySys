/**
 * @fileoverview detect-patterns.js
 * 
 * RE-EXPORT: Este archivo ahora solo re-exporta desde el módulo patterns/
 * para mantener backward compatibility.
 * 
 * La implementación completa se movió a:
 * src/layer-c-memory/mcp/tools/patterns/
 * 
 * Cada detector está en su propio archivo para mantener archivos < 250 líneas.
 */

export { detect_patterns } from './patterns/index.js';
