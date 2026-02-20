/**
 * @fileoverview validate-imports.js
 * 
 * RE-EXPORT: Este archivo ahora solo re-exporta desde el módulo validators/
 * para mantener backward compatibility.
 * 
 * La implementación completa se movió a:
 * src/layer-c-memory/mcp/tools/validators/
 * 
 * @module validate-imports
 */

export { validate_imports, checkImportExists, resolveImportPath, getImportSuggestion } from './validators/index.js';
