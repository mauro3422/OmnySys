/**
 * @fileoverview Code Generator for Test Generation
 * 
 * Genera código de test basado en el análisis.
 * 
 * @module mcp/tools/generate-tests/code-generator
 */

import { generateTypedInputs } from './input-generator.js';
import { resolveFactory, resolveBuilderForParam, resolveFactoryImportPath } from './factory-catalog.js';

// Máximo de tests por archivo — evita describe blocks gigantes
const MAX_TESTS_PER_FILE = 12;

/**
 * Selecciona y ordena los tests más valiosos respetando el cap.
 * Estrategia: 1 happy-path obligatorio + branches (high) + edge-cases hasta MAX.
 */
// Tipos de tests con bajo valor — se descartan si hay cap
const LOW_VALUE_TYPES = new Set(['integration', 'branch-coverage', 'other']);

function selectTests(tests) {
  const happy      = tests.filter(t => t.type === 'happy-path');
  const throws     = tests.filter(t => t.type === 'error-throw');
  const branches   = tests.filter(t => t.type === 'branch' && t.priority === 'high');
  const edges      = tests.filter(t => t.type === 'edge-case' && t.priority !== 'low');
  // Resto: solo incluir si no son low-value y quedan slots
  const rest       = tests.filter(t =>
    !happy.includes(t) && !throws.includes(t) &&
    !branches.includes(t) && !edges.includes(t) &&
    !LOW_VALUE_TYPES.has(t.type)
  );

  const selected = [
    ...happy.slice(0, 1),   // siempre 1 happy-path
    ...throws,              // todos los throw tests (alto valor)
    ...branches,            // todos los branches high-priority
    ...edges,               // edge-cases medium+
    ...rest,
  ].slice(0, MAX_TESTS_PER_FILE);

  return selected;
}

/**
 * Agrupa tests por tipo para nested describes.
 * Retorna un mapa: label → tests[]
 */
function groupByType(tests) {
  const groups = new Map();
  for (const t of tests) {
    const label =
      t.type === 'happy-path' ? 'happy path' :
      t.type === 'branch'     ? 'branches'   :
      t.type === 'edge-case'  ? 'edge cases' :
      t.type === 'error-throw'? 'error handling' :
      'other';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(t);
  }
  return groups;
}

/**
 * Encuentra el nombre de export correcto para una función
 * Maneja casos donde el nombre del átomo no coincide con el export
 */
function findCorrectExportName(atom) {
  const atomName = atom.name;
  
  const commonSuffixes = ['Optimized', 'Async', 'V2', 'New', 'Internal', 'Helper'];
  for (const suffix of commonSuffixes) {
    if (atomName.endsWith(suffix)) {
      const baseName = atomName.slice(0, -suffix.length);
      return { primary: baseName, alternatives: [atomName, baseName + 'Async', 'validate' + baseName] };
    }
  }
  
  if (atomName.startsWith('validate')) {
    return { primary: atomName, alternatives: [atomName + 'Optimized', atomName.replace('validate', 'validatePost')] };
  }
  
  if (atomName.startsWith('get') || atomName.startsWith('set') || atomName.startsWith('is')) {
    return { primary: atomName, alternatives: [atomName + 'Sync', atomName + 'Async', atomName] };
  }
  
  return { primary: atomName, alternatives: [atomName] };
}

/**
 * Genera el import para la función con validación de exports
 */
function generateFunctionImport(atom) {
  const importPath = resolveImportAlias(atom.filePath);
  const { primary, alternatives } = findCorrectExportName(atom);
  
  return { importPath, exportName: primary, alternatives };
}

/**
 * Recopila los imports necesarios para los branch tests
 */
function collectBranchImports(tests) {
  const imports = new Map();
  
  for (const test of tests) {
    if (test.type !== 'branch') continue;
    
    const needed = test.neededImports;
    if (!needed) continue;
    
    for (const [source, names] of Object.entries(needed)) {
      if (!imports.has(source)) {
        imports.set(source, new Set());
      }
      for (const name of names) {
        imports.get(source).add(name);
      }
    }
  }
  
  return imports;
}

/**
 * Genera los imports necesarios
 */
function generateImports(atom, useRealFactories, needSandbox, branchImports = new Map()) {
  let code = '';
  
  // Import de vitest
  code += "import { describe, it, expect, vi } from 'vitest';\n";
  
  // Sandbox si es necesario
  if (needSandbox) {
    code += "import { withSandbox } from '#layer-c/test-utils/sandbox.js';\n";
  }
  
  // Imports de factories (si useRealFactories)
  if (useRealFactories && atom) {
    const factoryEntry = resolveFactory(atom.filePath);
    if (factoryEntry) {
      const importPath = resolveFactoryImportPath(factoryEntry.factoryPath, outputPath);
      
      // Extraer nombres de builders únicos (sin 'default' key)
      const builderNames = Object.values(factoryEntry.builders || {})
        .filter(b => b && b.name)
        .map(b => b.name);
      const uniqueBuilders = [...new Set(builderNames)];
      if (uniqueBuilders.length > 0) {
        code += `import { ${uniqueBuilders.join(', ')} } from '${importPath}';\n`;
      }
    }
  }
  
  // Imports de constantes necesarias para branch tests (Priority, ChangeType, etc.)
  for (const [source, names] of branchImports.entries()) {
    // Intentar resolver alias primero, sino usar el path tal cual (ya tiene ./ o ../)
    let resolvedSource = resolveImportAlias(source);
    if (!resolvedSource || resolvedSource === source) {
      // Limpiar doble slash o ./. artifacts
      resolvedSource = source.replace(/\/\.\//g, '/').replace(/^\.\//, './');
    }
    code += `import { ${[...names].join(', ')} } from '${resolvedSource}';\n`;
  }

  // Import de la función — mapear src/ a alias # para compatibilidad con vitest
  const { importPath, exportName, alternatives } = generateFunctionImport(atom);
  code += `import { ${exportName} } from '${importPath}';\n`;
  
  // Guardar alternativas en el átomo para referencia en generateTestCase
  atom._exportAlternatives = alternatives;
  
  code += `\n`;
  
  return code;
}

/**
 * Genera codigo de test completo
 */
export function generateTestCode(atom, tests, options = {}) {
  const { useRealFactories = true, outputPath = 'tests/generated' } = options;
  const hasSideEffects = atom.hasSideEffects ||
                         atom.sideEffects?.hasStorageAccess ||
                         atom.sideEffects?.hasNetworkCalls;
  const needSandbox = hasSideEffects || tests.some(t => t.needsSandbox);

  // Seleccionar los tests más valiosos respetando el cap
  const selected = selectTests(tests);

  // Recopilar neededImports de todos los branch tests
  const branchImports = collectBranchImports(selected);

  let code = '';

  // Imports
  code += generateImports(atom, useRealFactories, needSandbox, branchImports);

  // Describe principal
  code += `describe('${atom.name}', () => {\n`;

  // Agrupar en nested describes si hay más de un tipo
  const groups = groupByType(selected);
  const useNested = groups.size > 1;

  if (useNested) {
    for (const [label, groupTests] of groups) {
      code += `  describe('${label}', () => {\n`;
      for (const test of groupTests) {
        code += generateTestCase(atom, test, useRealFactories && needSandbox, '    ');
      }
      code += `  });\n\n`;
    }
  } else {
    for (const test of selected) {
      code += generateTestCase(atom, test, useRealFactories && needSandbox);
    }
  }

  code += `});\n`;

  return code;
}

/**
 * Genera un caso de test individual
 * @param {string} indent - Indentación base (default '  ' para nivel top-level describe)
 */
export function generateTestCase(atom, test, useSandbox, indent = '  ') {
  let code = '';
  const inputs = atom.dataFlow?.inputs || [];
  const isAsync = atom.isAsync;
  const inner = indent + '  ';
  
  // Usar el nombre de export correcto
  const fnName = atom._exportAlternatives?.[0] || atom.name;

  const needsAsync = isAsync || useSandbox;
  code += `${indent}it('${test.name}', ${needsAsync ? 'async ' : ''}() => {\n`;

  // Setup comments si hay
  if (test.setup?.length > 0) {
    for (const line of test.setup) {
      code += `${inner}${line}\n`;
    }
  }

  // Generar llamada con inputs — pasar atom para usar factory builders si aplica
  const inputCall = generateInputCall(inputs, test.inputs, atom);

  // Determinar si es un test de throw
  const isThrowTest = test.type === 'error-throw' || test.assertion?.includes('toThrow');

  if (useSandbox) {
    code += `${inner}await withSandbox({}, async (sandbox) => {\n`;
    if (isThrowTest && isAsync) {
      code += `${inner}  await expect(${fnName}(${inputCall})).rejects.toThrow();\n`;
    } else if (isThrowTest) {
      code += `${inner}  expect(() => ${fnName}(${inputCall})).toThrow();\n`;
    } else {
      code += `${inner}  const result = ${isAsync ? 'await ' : ''}${fnName}(${inputCall});\n`;
      code += `${inner}  ${test.assertion};\n`;
    }
    code += `${inner}});\n`;
  } else {
    if (isThrowTest && isAsync) {
      code += `${inner}await expect(${fnName}(${inputCall})).rejects.toThrow();\n`;
    } else if (isThrowTest) {
      code += `${inner}expect(() => ${fnName}(${inputCall})).toThrow();\n`;
    } else {
      code += `${inner}const result = ${isAsync ? 'await ' : ''}${fnName}(${inputCall});\n`;
      code += `${inner}  ${test.assertion};\n`;
    }
  }

  code += `${indent}});\n\n`;

  return code;
}

/**
 * Genera la llamada con inputs — fallback tipado en lugar de '{}' genérico
 */
export function generateInputCall(inputs, testInputs, atom) {
  if (!inputs || inputs.length === 0) return '';

  const factoryEntry = atom ? resolveFactory(atom.filePath) : null;
  const callGraph = atom?.callGraph || {};

  return inputs.map(i => {
    if (testInputs && i.name in testInputs) {
      return testInputs[i.name];
    }
    // Intentar builder del catálogo de factories
    if (factoryEntry) {
      const builder = resolveBuilderForParam(i.name, factoryEntry);
      if (builder) return builder.call;
    }
    // Fallback tipado según el tipo inferido del parámetro, incluyendo callGraph
    return inferFallbackValue(i, callGraph);
  }).join(', ');
}

/**
 * Mapeo declarativo de nombres de parámetros a valores de fallback
 */
const PARAM_NAME_MAPPINGS = [
  { pattern: /^(res|response|.*response)$/i, value: 'vi.fn(() => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() }))' },
  { pattern: /^(req|request|.*request)$/i, value: '{ body: {}, params: {}, query: {}, headers: {}, method: "GET", path: "/test" }' },
  { pattern: /^state$/i, value: '{ paused: false, resume: vi.fn(), pause: vi.fn() }' },
  { pattern: /(next|callback)/i, value: 'vi.fn()' },
  { pattern: /(path|file)/i, value: '"/test/file.js"' },
  { pattern: /url/i, value: '"https://example.com"' },
  { pattern: /id/i, value: '"test-id"' },
  { pattern: /name/i, value: '"test-name"' },
  { pattern: /(code|source)/i, value: '"const x = 1;"' },
  { pattern: /(text|content)/i, value: '"sample text"' },
  { pattern: /(options|opts|config)/i, value: '{ enabled: true }' },
  { pattern: /(callback|fn|handler)/i, value: 'vi.fn()' },
  { pattern: /(arr|list|items)/i, value: '[]' },
  { pattern: /(num|count|limit)/i, value: '10' },
  { pattern: /(bool|flag)/i, value: 'true' },
];

/**
 * Mapeo por tipo de dato
 */
const TYPE_MAPPINGS = {
  'string': '"sample-string"',
  'number': '42',
  'boolean': 'true',
  'array': '[]',
  'object': '{}',
  'function': 'vi.fn()',
};

/**
 * Infiere un valor de fallback razonable según el tipo, nombre y callGraph del parámetro
 */
function inferFallbackValue(input, callGraph = {}) {
  const n = (input.name || '').toLowerCase();
  const t = (input.type || '').toLowerCase();
  const calls = callGraph?.callsList || [];
  
  const hasHttpCall = calls.some(c => ['status', 'json', 'send', 'redirect'].includes(c.name));
  
  if (hasHttpCall && (n === 'res' || n === 'response')) {
    return 'vi.fn(() => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() }))';
  }
  if (hasHttpCall && (n === 'req' || n === 'request')) {
    return '{ body: {}, params: {}, query: {}, headers: {}, method: "GET", path: "/test" }';
  }
  
  for (const { pattern, value } of PARAM_NAME_MAPPINGS) {
    if (pattern.test(n)) return value;
  }
  
  return TYPE_MAPPINGS[t] || '{}';
}

/**
 * Mapea rutas src/ a los alias # definidos en package.json#imports
 */
function resolveImportAlias(filePath) {
  const p = filePath.replace(/\\/g, '/');
  if (p.startsWith('src/ai/'))             return p.replace('src/ai/', '#ai/');
  if (p.startsWith('src/core/'))           return p.replace('src/core/', '#core/');
  if (p.startsWith('src/layer-a-static/')) return p.replace('src/layer-a-static/', '#layer-a/');
  if (p.startsWith('src/layer-b-semantic/')) return p.replace('src/layer-b-semantic/', '#layer-b/');
  if (p.startsWith('src/layer-c-memory/')) return p.replace('src/layer-c-memory/', '#layer-c/');
  if (p.startsWith('src/layer-graph/'))    return p.replace('src/layer-graph/', '#layer-graph/');
  if (p.startsWith('src/config/'))         return p.replace('src/config/', '#config/');
  // No alias disponible — usar path relativo desde raíz del proyecto (compatible con vitest rootDir)
  return `../../${p}`;
}

export default {
  generateTestCode,
  generateTestCase,
  generateInputCall
};
