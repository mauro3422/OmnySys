/**
 * @fileoverview Extractor Registry
 * 
 * Registro centralizado de todos los extractors de metadata.
 * 
 * PARA AGREGAR UN NUEVO EXTRACTOR:
 * 1. Crear el archivo extractor en src/layer-a-static/extractors/metadata/
 * 2. Agregar una entrada en EXTRACTOR_REGISTRY abajo
 * 3. ¡Listo! El sistema lo descubre automáticamente
 * 
 * @module extractors/metadata/registry
 */

/**
 * Campos base del átomo (no son extractores, se calculan en metadata-builder)
 */
export const BASE_ATOM_FIELDS = [
  { name: 'id', description: 'Unique atom identifier', usedByTools: ['get_function_details'] },
  { name: 'name', description: 'Function name', usedByTools: ['get_function_details', 'get_call_graph'] },
  { name: 'filePath', description: 'File path', usedByTools: ['get_function_details', 'validate_imports'] },
  { name: 'line', description: 'Start line', usedByTools: ['get_function_details'] },
  { name: 'endLine', description: 'End line', usedByTools: ['get_function_details'] },
  { name: 'linesOfCode', description: 'Lines of code', usedByTools: ['get_function_details', 'get_health_metrics'] },
  { name: 'complexity', description: 'Cyclomatic complexity', usedByTools: ['get_function_details', 'get_health_metrics'] },
  { name: 'isExported', description: 'Is exported', usedByTools: ['detect_patterns', 'get_impact_map'] },
  { name: 'isAsync', description: 'Is async', usedByTools: ['get_async_analysis', 'get_function_details'] },
  { name: 'className', description: 'Class name', usedByTools: ['get_molecule_summary', 'get_call_graph'] },
  { name: 'functionType', description: 'Function type', usedByTools: ['get_atom_schema'] },
  { name: 'isTestCallback', description: 'Is test callback', usedByTools: ['get_atom_schema', 'detect_patterns'] },
  { name: 'hasSideEffects', description: 'Has side effects', usedByTools: ['get_function_details'] },
  { name: 'hasErrorHandling', description: 'Has error handling', usedByTools: ['get_function_details'] },
  { name: 'calls', description: 'Calls list', usedByTools: ['get_call_graph', 'explain_value_flow'] },
  { name: 'calledBy', description: 'Called by list', usedByTools: ['get_call_graph', 'get_impact_map'] },
  { name: 'archetype', description: 'Atom archetype', usedByTools: ['get_molecule_summary', 'detect_patterns'] },
  { name: 'purpose', description: 'Atom purpose', usedByTools: ['get_molecule_summary'] },
  { name: 'callerPattern', description: 'Caller pattern', usedByTools: ['get_function_details'] },
  { name: 'derived', description: 'Derived scores', usedByTools: ['get_function_details', 'suggest_refactoring'] },
  { name: 'dna', description: 'DNA fingerprint', usedByTools: ['detect_patterns'] },
  { name: 'dataFlowAnalysis', description: 'Data flow analysis metadata (invariants, inferred types)', usedByTools: ['get_function_details'] },
  { name: '_meta', description: 'Extraction metadata', usedByTools: ['get_function_details'] },
];

/**
 * Registry de todos los extractores disponibles
 *
 * Cada entrada define:
 *   - name: clave del resultado en extractorResults
 *   - file: ruta relativa al extractor (desde este directorio)
 *   - function: nombre del export a llamar
 *   - level: 'file' (per-file) | 'atom' (per-atom, llamado desde atom-extractor)
 *   - getArgs: función que recibe ctx y devuelve el array de argumentos
 *              ctx = { functionCode, functionInfo, fileMetadata, filePath, results }
 *              results acumula los resultados de extractores anteriores (en orden)
 *   - usedByTools: herramientas MCP que consumen este campo
 *   - description: descripción del extractor
 *
 * PARA AGREGAR UN NUEVO EXTRACTOR DE ÁTOMO:
 *   1. Crear el archivo en src/layer-a-static/extractors/metadata/
 *   2. Agregar una entrada aquí con getArgs
 *   3. Usar el resultado en metadata-builder.js con extractorResults.miExtractor
 *   ¡Solo 3 pasos!
 */
export const EXTRACTOR_REGISTRY = [
  // ── File-level extractors (no auto-invocados por atom-extractor) ─────────────
  { name: 'jsdoc', file: './jsdoc-contracts.js', function: 'extractJSDocContracts', description: 'JSDoc contracts', usedByTools: ['get_function_details'], level: 'file' },
  { name: 'runtime', file: './runtime-contracts.js', function: 'extractRuntimeContracts', description: 'Runtime contracts', usedByTools: ['get_function_details'], level: 'file' },
  { name: 'async', file: './async-patterns.js', function: 'extractAsyncPatterns', description: 'Async patterns', usedByTools: ['get_async_analysis', 'get_function_details'], level: 'file' },
  { name: 'errors', file: './error-handling.js', function: 'extractErrorHandling', description: 'Error handling', usedByTools: ['get_function_details'], level: 'file' },
  { name: 'build', file: './build-time-deps.js', function: 'extractBuildTimeDependencies', description: 'Build deps', usedByTools: ['detect_patterns'], level: 'file' },
  { name: 'dataFlow', file: './data-flow.js', function: 'extractDataFlow', description: 'Data flow', usedByTools: ['explain_value_flow', 'get_function_details', 'generate_tests'], level: 'file' },
  { name: 'typeInference', file: './type-inference.js', function: 'extractTypeInference', description: 'Type inference', usedByTools: ['get_function_details'], level: 'file' },
  { name: 'depDepth', file: './dependency-depth.js', function: 'extractDependencyDepth', description: 'Dependency depth', usedByTools: ['get_health_metrics'], level: 'file' },
  { name: 'historical', file: './historical-metadata.js', function: 'extractHistoricalMetadata', description: 'Historical metadata', usedByTools: ['get_atom_history'], level: 'file', requiresPath: true },
  { name: 'dna', file: './dna-extractor.js', function: 'extractDNA', description: 'DNA fingerprint', usedByTools: ['detect_patterns', 'get_function_details'], level: 'file' },

  // ── Atom-level extractors (auto-invocados por atom-extractor en orden) ───────
  // IMPORTANTE: el orden importa — los extractores que dependen de resultados
  // anteriores deben ir DESPUÉS de los que producen esos resultados.
  {
    name: 'sideEffects',
    file: './side-effects.js',
    function: 'extractSideEffects',
    description: 'Side effects',
    usedByTools: ['get_function_details', 'detect_patterns'],
    level: 'atom',
    getArgs: ({ functionCode }) => [functionCode]
  },
  {
    name: 'callGraph',
    file: './call-graph.js',
    function: 'extractCallGraph',
    description: 'Call graph',
    usedByTools: ['get_call_graph', 'explain_value_flow', 'get_function_details'],
    level: 'atom',
    getArgs: ({ functionCode }) => [functionCode]
  },
  {
    name: 'temporal',
    file: './temporal-patterns.js',
    function: 'extractTemporalPatterns',
    description: 'Temporal patterns',
    usedByTools: ['get_function_details', 'get_async_analysis'],
    level: 'atom',
    getArgs: ({ functionCode }) => [functionCode]
  },
  {
    name: 'performanceHints',
    file: './performance-hints.js',
    function: 'extractPerformanceHints',
    description: 'Performance hints',
    usedByTools: ['get_function_details', 'get_health_metrics'],
    level: 'atom',
    getArgs: ({ functionCode }) => [functionCode]
  },
  {
    name: 'performanceMetrics',
    file: './performance-impact/index.js',
    function: 'extractPerformanceMetrics',
    description: 'Performance metrics',
    usedByTools: ['get_function_details', 'get_health_metrics'],
    level: 'atom',
    // depends on: performanceHints
    getArgs: ({ functionCode, results }) => [functionCode, results.performanceHints]
  },
  {
    name: 'typeContracts',
    file: './type-contracts/index.js',
    function: 'extractTypeContracts',
    description: 'Type contracts',
    usedByTools: ['get_function_details', 'generate_tests'],
    level: 'atom',
    getArgs: ({ functionCode, fileMetadata, functionInfo }) => [functionCode, fileMetadata.jsdoc, functionInfo]
  },
  {
    name: 'errorFlow',
    file: './error-flow/index.js',
    function: 'extractErrorFlow',
    description: 'Error flow',
    usedByTools: ['get_function_details', 'generate_tests'],
    level: 'atom',
    // depends on: typeContracts
    getArgs: ({ functionCode, results }) => [functionCode, results.typeContracts]
  },
  {
    name: 'temporalPatterns',
    file: './temporal-connections/index.js',
    function: 'extractTemporalPatterns',
    description: 'Temporal connections',
    usedByTools: ['get_function_details', 'get_async_analysis'],
    level: 'atom',
    getArgs: ({ functionCode, functionInfo }) => [functionCode, functionInfo]
  },
  {
    name: 'semanticDomain',
    file: './semantic-domain.js',
    function: 'extractSemanticDomain',
    description: 'Semantic domain',
    usedByTools: ['get_function_details', 'generate_tests'],
    level: 'atom',
    getArgs: ({ functionCode, functionInfo, filePath }) => [functionCode, functionInfo.name, filePath]
  },
];

export function getFileLevelExtractors() {
  return EXTRACTOR_REGISTRY.filter(e => e.level === 'file');
}

export function getAtomLevelExtractors() {
  return EXTRACTOR_REGISTRY.filter(e => e.level === 'atom');
}

export function getExtractor(name) {
  return EXTRACTOR_REGISTRY.find(e => e.name === name);
}

export function getAvailableFields() {
  const extractorFields = EXTRACTOR_REGISTRY.map(e => ({
    name: e.name,
    description: e.description,
    usedByTools: e.usedByTools,
    level: e.level,
    source: 'extractor'
  }));
  
  const baseFields = BASE_ATOM_FIELDS.map(f => ({
    ...f,
    level: 'base',
    source: 'base'
  }));
  
  return [...baseFields, ...extractorFields];
}

export function getFieldToolCoverage() {
  const coverage = {};
  
  for (const field of BASE_ATOM_FIELDS) {
    coverage[field.name] = field.usedByTools;
  }
  
  for (const extractor of EXTRACTOR_REGISTRY) {
    coverage[extractor.name] = extractor.usedByTools;
  }
  
  return coverage;
}

export default {
  BASE_ATOM_FIELDS,
  EXTRACTOR_REGISTRY,
  getFileLevelExtractors,
  getAtomLevelExtractors,
  getExtractor,
  getAvailableFields,
  getFieldToolCoverage
};
