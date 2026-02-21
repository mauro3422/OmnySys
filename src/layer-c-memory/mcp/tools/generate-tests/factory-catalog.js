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
 * @param {string} testOutputPath - Ej: "tests/generated/core/atomic-editor/..."
 * @returns {string} - Import path relativo
 */
export function resolveFactoryImportPath(factoryPath) {
  if (!factoryPath) return null;
  // Desde tests/generated/** → ../../factories/...
  return factoryPath.replace('tests/factories/', '../../factories/');
}

export default { resolveFactory, resolveBuilderForParam, resolveFactoryImportPath };
