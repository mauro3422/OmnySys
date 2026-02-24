/**
 * @fileoverview Factory Catalog for Test Generation
 *
 * Mapea rutas de módulos a sus factories de test correspondientes.
 * El generador usa este catálogo para importar builders reales
 * en lugar de valores hardcodeados genéricos.
 *
 * @module mcp/tools/generate-tests/factory-catalog
 */

/**
 * Catálogo: path prefix → factory info
 * Orden importa — más específico primero.
 */
const FACTORY_CATALOG = [
  // Test Factories - Comprehensive Extractor
  {
    pathPrefix: 'tests/factories/comprehensive-extractor-test',
    factoryPath: 'tests/factories/comprehensive-extractor-test/builders/index.js',
    builders: {
      config:  { name: 'ExtractionConfigBuilder', call: 'ExtractionConfigBuilder.minimal()' },
      class:   { name: 'ClassExtractionBuilder', call: 'ClassExtractionBuilder.simpleClass()' },
      function:{ name: 'FunctionExtractionBuilder', call: 'FunctionExtractionBuilder.simpleFunction()' },
      import:  { name: 'ImportExportBuilder', call: 'ImportExportBuilder.es6Imports()' },
      ast:     { name: 'ASTBuilder', call: 'ASTBuilder.withFunctionDeclaration().build()' },
      default: { name: 'ExtractionConfigBuilder', call: 'ExtractionConfigBuilder.minimal()' }
    }
  },
  // Test Factories - Module System
  {
    pathPrefix: 'tests/factories/module-system-test',
    factoryPath: 'tests/factories/module-system-test/builders/index.js',
    builders: {
      module:  { name: 'ModuleBuilder', call: 'ModuleBuilder.withSimpleModule().build()' },
      dependency: { name: 'DependencyBuilder', call: 'DependencyBuilder.simple().build()' },
      default: { name: 'ModuleBuilder', call: 'ModuleBuilder.withSimpleModule().build()' }
    }
  },
  // Test Factories - Query
  {
    pathPrefix: 'tests/factories/query-test',
    factoryPath: 'tests/factories/query-test/builders/index.js',
    builders: {
      project: { name: 'ProjectDataBuilder', call: 'ProjectDataBuilder.create().build()' },
      file:    { name: 'FileDataBuilder', call: 'FileDataBuilder.create().build()' },
      connection: { name: 'ConnectionBuilder', call: 'ConnectionBuilder.create().build()' },
      query:   { name: 'QueryBuilder', call: 'QueryBuilder.create().build()' },
      scenario:{ name: 'QueryScenarios', call: 'QueryScenarios.emptyProject()' },
      fs:      { name: 'MockFileSystem', call: 'MockFileSystem.create().build()' },
      default: { name: 'QueryBuilder', call: 'QueryBuilder.create().build()' }
    }
  },
  // Source Code Factories
  {
    pathPrefix: 'src/core/atomic-editor',
    factoryPath: 'tests/factories/core-atomic-editor/builders.js',
    builders: {
      operation: { name: 'EditOperationBuilder', call: 'EditOperationBuilder.create().withFile("src/test.js").build()' },
      options:   { name: 'ValidationResultBuilder', call: 'ValidationResultBuilder.create().asValid().build()' },
      default:   { name: 'EditOperationBuilder', call: 'EditOperationBuilder.create().build()' }
    }
  },
  {
    pathPrefix: 'src/layer-a-static/pipeline',
    factoryPath: 'tests/factories/phases-test/builders.js',
    builders: {
      atom:    { name: 'AtomBuilder', call: 'new AtomBuilder().build()' },
      atoms:   { name: 'AtomBuilder', call: '[new AtomBuilder().build()]' },
      default: { name: 'AtomBuilder', call: 'new AtomBuilder().build()' }
    }
  },
  {
    pathPrefix: 'src/layer-a-static',
    factoryPath: 'tests/factories/shared/builders.js',
    builders: {
      atom:    { name: 'AtomBuilder', call: 'new AtomBuilder().build()' },
      atoms:   { name: 'AtomBuilder', call: '[new AtomBuilder().build()]' },
      default: { name: 'AtomBuilder', call: 'new AtomBuilder().build()' }
    }
  },
  {
    pathPrefix: 'src/layer-c-memory/mcp',
    factoryPath: 'tests/factories/layer-c-mcp/builders.js',
    builders: {
      default: null // usa typed inputs — no hay builders específicos
    }
  },
  {
    pathPrefix: 'src/layer-b-semantic',
    factoryPath: 'tests/factories/layer-b-metadata/builders.js',
    builders: {
      atom:    { name: 'AtomBuilder', call: 'new AtomBuilder().build()' },
      default: { name: 'AtomBuilder', call: 'new AtomBuilder().build()' }
    }
  },
  {
    pathPrefix: 'src/core/batch-processor',
    factoryPath: null, // no factory — usar typed inputs
    builders: {}
  }
];

/**
 * Busca la factory entry para un filePath dado
 * @param {string} filePath - Ruta del archivo fuente (ej: "src/core/atomic-editor/execution/op.js")
 * @returns {{ factoryPath: string|null, builders: Object }|null}
 */
export function resolveFactory(filePath) {
  const p = (filePath || '').replace(/\\/g, '/');
  const entry = FACTORY_CATALOG.find(e => p.startsWith(e.pathPrefix));
  return entry || null;
}

/**
 * Dado un nombre de parámetro y una factory entry,
 * devuelve el builder code a usar como valor del parámetro.
 * @param {string} paramName
 * @param {Object} factoryEntry
 * @returns {string|null} - Código JS para construir el input, o null si no hay builder
 */
export function resolveBuilderForParam(paramName, factoryEntry) {
  if (!factoryEntry?.builders) return null;
  const name = paramName.toLowerCase();

  // Buscar match directo por nombre de parámetro
  for (const [key, builder] of Object.entries(factoryEntry.builders)) {
    if (key === 'default') continue;
    if (name.includes(key)) return builder;
  }

  // Fallback al builder default
  return factoryEntry.builders.default || null;
}

/**
 * Calcula el path relativo de la factory desde el archivo de test generado.
 * Los tests se generan en tests/generated/**, las factories están en tests/factories/**.
 * @param {string} factoryPath - Ej: "tests/factories/core-atomic-editor/builders.js"
 * @param {string} testOutputPath - Ej: "tests/generated/core/atomic-editor/..." (optional)
 * @returns {string} - Import path relativo
 */
export function resolveFactoryImportPath(factoryPath, testOutputPath = 'tests/generated') {
  if (!factoryPath) return null;
  
  // Calcular profundidad del path de salida
  const depth = (testOutputPath.match(/\//g) || []).length;
  const upLevels = '../'.repeat(depth);
  
  // Reemplazar tests/factories/ con el path relativo
  return factoryPath.replace('tests/factories/', upLevels + 'factories/');
}

export default { resolveFactory, resolveBuilderForParam, resolveFactoryImportPath };
