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
  
  // Import de la función
  const importPath = atom.filePath.replace(/\\/g, '/');
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
  
  code += `  it('${test.name}', ${isAsync ? 'async ' : ''}() => {\n`;
  
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
 * Genera la llamada con inputs
 */
export function generateInputCall(inputs, testInputs) {
  if (!inputs || inputs.length === 0) return '';
  
  return inputs.map(i => {
    if (testInputs && i.name in testInputs) {
      return testInputs[i.name];
    }
    return '{}';
  }).join(', ');
}

export default {
  generateTestCode,
  generateTestCase,
  generateInputCall
};
