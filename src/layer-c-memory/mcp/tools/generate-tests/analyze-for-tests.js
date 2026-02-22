/**
 * @fileoverview Analyze for Tests
 * 
 * Analiza archivos para detectar funciones/clases testeables.
 * 
 * ⚠️ DEPRECATED: This file is kept for backward compatibility.
 * Please import directly from the analyze-for-tests/ directory:
 *   import { analyzeForTests, analyzeClass, analyzeFunction } from './analyze-for-tests/index.js';
 * 
 * @module mcp/tools/generate-tests/analyze-for-tests
 * @deprecated Use analyze-for-tests/ directory modules instead
 */

import { analyzeForTests, analyzeClass, analyzeFunction } from './analyze-for-tests/index.js';

export { analyzeForTests, analyzeClass, analyzeFunction };

export default {
  analyzeForTests,
  analyzeClass,
  analyzeFunction
};
