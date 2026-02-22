/**
 * @fileoverview Source Code Analyzer for Test Generation
 *
 * Lee el código fuente de la función y extrae información específica
 * para generar tests más inteligentes.
 *
 * @module mcp/tools/generate-tests/source-analyzer
 */

export { readFunctionSource } from './readers/index.js';
export { analyzeSourceForTests } from './analyzers/index.js';
export { generateSpecificTests } from './generators/index.js';

import { readFunctionSource } from './readers/index.js';
import { analyzeSourceForTests } from './analyzers/index.js';
import { generateSpecificTests } from './generators/index.js';

export default {
  readFunctionSource,
  analyzeSourceForTests,
  generateSpecificTests
};
