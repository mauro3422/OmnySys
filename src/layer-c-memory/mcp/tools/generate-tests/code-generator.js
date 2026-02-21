/**
 * @fileoverview Code Generator for Test Generation
 * 
 * Genera código de test basado en el análisis.
 * 
 * @module mcp/tools/generate-tests/code-generator
 */

import { generateTypedInputs } from './input-generator.js';

/**
 * Genera codigo de test completo
 */
export function generateTestCode(atom, tests, options = {}) {
  const { useRealFactories = true } = options;
  const hasSideEffects = atom.hasSideEffects || 
                         atom.sideEffects?.hasStorageAccess || 
                         atom.sideEffects?.hasNetworkCalls;
  const needSandbox = hasSideEffects || tests.some(t => t.needsSandbox);
  
  let code = '';
  
  // Imports
  code += generateImports(atom, useRealFactories, needSandbox);
  
  // Describe block
  code += `describe('${atom.name}', () => {\n`;
  
  // Generar cada test
  for (const test of tests) {
    code += generateTestCase(atom, test, useRealFactories && needSandbox);
  }
  
  code += `});\n`;
  
  return code;
}

/**
 * Genera los imports necesarios
 */
function generateImports(atom, useRealFactories, needSandbox) {
  let code = '';
  
  // Imports base
  code += `import { describe, it, expect, vi } from 'vitest';\n`;
  
  // Import sandbox si hay side effects
  if (useRealFactories && needSandbox) {
    code += `import { withSandbox } from '#test-factories/real/index.js';\n`;
  }
  
  // Import de la función — mapear src/ a alias # para compatibilidad con vitest
  const importPath = resolveImportAlias(atom.filePath);
  code += `import { ${atom.name} } from '${importPath}';\n`;
  
  code += `\n`;
  
  return code;
}

/**
 * Genera un caso de test individual
 */
export function generateTestCase(atom, test, useSandbox) {
  let code = '';
  const inputs = atom.dataFlow?.inputs || [];
  const isAsync = atom.isAsync;
  
  const needsAsync = isAsync || useSandbox;
  code += `  it('${test.name}', ${needsAsync ? 'async ' : ''}() => {\n`;
  
  // Setup comments si hay
  if (test.setup?.length > 0) {
    for (const line of test.setup) {
      code += `    ${line}\n`;
    }
  }
  
  // Generar llamada con inputs
  const inputCall = generateInputCall(inputs, test.inputs);
  
  // Determinar si es un test de throw
  const isThrowTest = test.type === 'error-throw' || test.assertion?.includes('toThrow');
  
  if (useSandbox) {
    code += `    await withSandbox({}, async (sandbox) => {\n`;
    if (isThrowTest && isAsync) {
      code += `      await expect(${atom.name}(${inputCall})).rejects.toThrow();\n`;
    } else if (isThrowTest) {
      code += `      expect(() => ${atom.name}(${inputCall})).toThrow();\n`;
    } else {
      code += `      const result = ${isAsync ? 'await ' : ''}${atom.name}(${inputCall});\n`;
      code += `      ${test.assertion};\n`;
    }
    code += `    });\n`;
  } else {
    if (isThrowTest && isAsync) {
      code += `    await expect(${atom.name}(${inputCall})).rejects.toThrow();\n`;
    } else if (isThrowTest) {
      code += `    expect(() => ${atom.name}(${inputCall})).toThrow();\n`;
    } else {
      code += `    const result = ${isAsync ? 'await ' : ''}${atom.name}(${inputCall});\n`;
      code += `    ${test.assertion};\n`;
    }
  }
  
  code += `  });\n\n`;
  
  return code;
}

/**
 * Genera la llamada con inputs — fallback tipado en lugar de '{}' genérico
 */
export function generateInputCall(inputs, testInputs) {
  if (!inputs || inputs.length === 0) return '';

  return inputs.map(i => {
    if (testInputs && i.name in testInputs) {
      return testInputs[i.name];
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
  if (p.startsWith('src/ai/'))          return p.replace('src/ai/', '#ai/');
  if (p.startsWith('src/core/'))        return p.replace('src/core/', '#core/');
  if (p.startsWith('src/layer-a-static/')) return p.replace('src/layer-a-static/', '#layer-a/');
  if (p.startsWith('src/layer-b-semantic/')) return p.replace('src/layer-b-semantic/', '#layer-b/');
  if (p.startsWith('src/layer-c-memory/')) return p.replace('src/layer-c-memory/', '#layer-c/');
  if (p.startsWith('src/layer-graph/')) return p.replace('src/layer-graph/', '#layer-graph/');
  if (p.startsWith('src/config/'))      return p.replace('src/config/', '#config/');
  return p; // fallback sin alias
}

export default {
  generateTestCode,
  generateTestCase,
  generateInputCall
};
