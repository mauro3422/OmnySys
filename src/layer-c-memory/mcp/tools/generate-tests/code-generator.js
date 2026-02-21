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
function selectTests(tests) {
  const happy   = tests.filter(t => t.type === 'happy-path');
  const branches = tests.filter(t => t.type === 'branch' && t.priority === 'high');
  const edges   = tests.filter(t => t.type === 'edge-case' && t.priority !== 'low');
  const rest    = tests.filter(t =>
    !happy.includes(t) && !branches.includes(t) && !edges.includes(t)
  );

  const selected = [
    ...happy.slice(0, 1),          // siempre 1 happy-path
    ...branches,                   // todos los branches high-priority
    ...edges,                      // edge-cases medium+
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
 * Genera codigo de test completo
 */
export function generateTestCode(atom, tests, options = {}) {
  const { useRealFactories = true } = options;
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
 * Genera los imports necesarios
 */
/**
 * Agrupa los neededImports de todos los branch tests en un mapa source→[names]
 */
function collectBranchImports(tests) {
  const map = new Map(); // source → Set<name>
  for (const test of tests) {
    for (const imp of test.neededImports || []) {
      if (!imp?.name || !imp?.from) continue;
      if (!map.has(imp.from)) map.set(imp.from, new Set());
      map.get(imp.from).add(imp.name);
    }
  }
  return map;
}

function generateImports(atom, useRealFactories, needSandbox, branchImports = new Map()) {
  let code = '';
  
  // Imports base
  code += `import { describe, it, expect, vi } from 'vitest';\n`;
  
  // Import factory builders si existen para este módulo
  if (useRealFactories) {
    const factoryEntry = resolveFactory(atom.filePath);
    if (factoryEntry?.factoryPath) {
      const importPath = resolveFactoryImportPath(factoryEntry.factoryPath);
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
  const importPath = resolveImportAlias(atom.filePath);
  code += `import { ${atom.name} } from '${importPath}';\n`;
  
  code += `\n`;
  
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
      code += `${inner}  await expect(${atom.name}(${inputCall})).rejects.toThrow();\n`;
    } else if (isThrowTest) {
      code += `${inner}  expect(() => ${atom.name}(${inputCall})).toThrow();\n`;
    } else {
      code += `${inner}  const result = ${isAsync ? 'await ' : ''}${atom.name}(${inputCall});\n`;
      code += `${inner}  ${test.assertion};\n`;
    }
    code += `${inner}});\n`;
  } else {
    if (isThrowTest && isAsync) {
      code += `${inner}await expect(${atom.name}(${inputCall})).rejects.toThrow();\n`;
    } else if (isThrowTest) {
      code += `${inner}expect(() => ${atom.name}(${inputCall})).toThrow();\n`;
    } else {
      code += `${inner}const result = ${isAsync ? 'await ' : ''}${atom.name}(${inputCall});\n`;
      code += `${inner}${test.assertion};\n`;
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

  return inputs.map(i => {
    if (testInputs && i.name in testInputs) {
      return testInputs[i.name];
    }
    // Intentar builder del catálogo de factories
    if (factoryEntry) {
      const builder = resolveBuilderForParam(i.name, factoryEntry);
      if (builder) return builder.call;
    }
    // Fallback tipado según el tipo inferido del parámetro
    return inferFallbackValue(i);
  }).join(', ');
}

/**
 * Infiere un valor de fallback razonable según el tipo y nombre del parámetro
 */
function inferFallbackValue(input) {
  const n = (input.name || '').toLowerCase();
  const t = (input.type || '').toLowerCase();

  if (n.includes('path') || n.includes('file')) return '"/test/file.js"';
  if (n.includes('url'))                          return '"https://example.com"';
  if (n.includes('id'))                           return '"test-id"';
  if (n.includes('name'))                         return '"test-name"';
  if (n.includes('code') || n.includes('source')) return '"const x = 1;"';
  if (n.includes('text') || n.includes('content'))return '"sample text"';
  if (n.includes('options') || n.includes('opts') || n.includes('config')) return '{}';
  if (n.includes('callback') || n.includes('fn') || n.includes('handler')) return 'vi.fn()';
  if (n.includes('arr') || n.includes('list') || n.includes('items'))      return '[]';

  switch (t) {
    case 'string':   return '"test-value"';
    case 'number':   return '0';
    case 'boolean':  return 'true';
    case 'array':    return '[]';
    case 'function': return 'vi.fn()';
    case 'object':   return '{}';
    default:         return '{}';
  }
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
