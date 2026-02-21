/**
 * @fileoverview Source Code Analyzer for Test Generation
 * 
 * Lee el código fuente de la función y extrae información específica
 * para generar tests más inteligentes.
 * 
 * @module mcp/tools/generate-tests/source-analyzer
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Lee el código fuente de una función
 */
export async function readFunctionSource(projectPath, filePath, atom) {
  if (!atom.line || !atom.endLine) {
    return null;
  }
  
  try {
    const fullPath = path.join(projectPath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    // Extraer líneas de la función (1-indexed a 0-indexed)
    const functionLines = lines.slice(atom.line - 1, atom.endLine);
    return functionLines.join('\n');
  } catch (error) {
    return null;
  }
}

/**
 * Analiza el código fuente y extrae patrones de test específicos
 */
export function analyzeSourceForTests(sourceCode, atom) {
  if (!sourceCode) {
    return { patterns: [], examples: [] };
  }
  
  const patterns = [];
  const examples = [];
  const inputs = atom.dataFlow?.inputs || [];
  
  // Detectar retornos específicos
  const returnMatches = extractReturnPatterns(sourceCode);
  patterns.push(...returnMatches);
  
  // Detectar llamadas a funciones específicas
  const callPatterns = extractCallPatterns(sourceCode, atom);
  patterns.push(...callPatterns);
  
  // Detectar literales usados
  const literals = extractLiterals(sourceCode);
  examples.push(...literals);
  
  // Detectar validaciones - pasar inputs para filtrar
  const validations = extractValidations(sourceCode, inputs);
  patterns.push(...validations);
  
  // Detectar bucles y condiciones
  const conditions = extractConditions(sourceCode);
  patterns.push(...conditions);
  
  return { patterns, examples };
}

/**
 * Extrae patrones de return del código
 */
function extractReturnPatterns(sourceCode) {
  const patterns = [];
  
  // Buscar returns con valores específicos
  const returnRegex = /return\s+({[^}]*}|\[[^\]]*\]|"[^"]*"|'[^']*'|\d+|true|false|null)/g;
  let match;
  
  while ((match = returnRegex.exec(sourceCode)) !== null) {
    const value = match[1];
    patterns.push({
      type: 'return-value',
      value: value,
      suggestion: `Test que verifique return ${value}`
    });
  }
  
  return patterns;
}

/**
 * Extrae patrones de llamadas a funciones
 */
function extractCallPatterns(sourceCode, atom) {
  const patterns = [];
  const callsList = atom.callGraph?.callsList || [];
  
  for (const call of callsList) {
    if (call.type === 'external' && !isNative(call.name)) {
      patterns.push({
        type: 'external-call',
        name: call.name,
        lines: call.lines,
        suggestion: `Mock ${call.name} para tests unitarios`
      });
    }
  }
  
  return patterns;
}

/**
 * Extrae literales del código para usar como ejemplos
 */
function extractLiterals(sourceCode) {
  const examples = [];
  
  // Strings
  const stringRegex = /["']([^"']+)["']/g;
  let match;
  while ((match = stringRegex.exec(sourceCode)) !== null) {
    if (match[1].length > 2 && match[1].length < 50) {
      examples.push({
        type: 'string',
        value: match[1],
        context: 'Usado en el código'
      });
    }
  }
  
  // Números específicos
  const numberRegex = /\b(\d{2,})\b/g;
  while ((match = numberRegex.exec(sourceCode)) !== null) {
    examples.push({
      type: 'number',
      value: parseInt(match[1]),
      context: 'Valor numérico usado'
    });
  }
  
  // Objetos JSON-like
  const objectRegex = /{\s*[\w"]+\s*:\s*[^}]+}/g;
  while ((match = objectRegex.exec(sourceCode)) !== null) {
    try {
      // Intentar parsear para ver si es JSON válido
      const parsed = JSON.parse(match[0]);
      examples.push({
        type: 'object',
        value: parsed,
        context: 'Objeto usado en el código'
      });
    } catch {
      // No es JSON válido, ignorar
    }
  }
  
  return examples;
}

/**
 * Extrae validaciones del código - SOLO para parámetros de entrada
 */
function extractValidations(sourceCode, inputParams = []) {
  const patterns = [];
  const inputNames = inputParams.map(p => p.name);
  
  // if (!variable) patterns - SOLO si variable es un parámetro de entrada
  const notValidRegex = /if\s*\(\s*!+(\w+)/g;
  let match;
  while ((match = notValidRegex.exec(sourceCode)) !== null) {
    if (inputNames.includes(match[1])) {
      patterns.push({
        type: 'validation',
        variable: match[1],
        condition: `!${match[1]}`,
        suggestion: `Test con ${match[1]} = null/undefined`
      });
    }
  }
  
  // if (variable === value) patterns - SOLO si variable es un parámetro
  const equalsRegex = /if\s*\(\s*(\w+)\s*===?\s*["']?(\w+)["']?\)/g;
  while ((match = equalsRegex.exec(sourceCode)) !== null) {
    if (inputNames.includes(match[1])) {
      patterns.push({
        type: 'condition',
        variable: match[1],
        value: match[2],
        suggestion: `Test con ${match[1]} = ${match[2]}`
      });
    }
  }
  
  // .includes(), .indexOf(), .has()
  const methodRegex = /\.includes?\(["']?(\w+)["']?\)/g;
  while ((match = methodRegex.exec(sourceCode)) !== null) {
    patterns.push({
      type: 'membership',
      value: match[1],
      suggestion: `Test con valor "${match[1]}" incluido/excluido`
    });
  }
  
  return patterns;
}

/**
 * Extrae condiciones interesantes para tests
 */
function extractConditions(sourceCode) {
  const patterns = [];
  
  // Detectar switches
  if (sourceCode.includes('switch')) {
    patterns.push({
      type: 'switch',
      suggestion: 'Test para cada case del switch'
    });
  }
  
  // Detectar múltiples ifs/else if
  const elseIfCount = (sourceCode.match(/else\s+if/g) || []).length;
  if (elseIfCount > 2) {
    patterns.push({
      type: 'multi-branch',
      count: elseIfCount + 1,
      suggestion: `Test para cada rama (${elseIfCount + 1} branches)`
    });
  }
  
  // Detectar for/while loops
  const loopCount = (sourceCode.match(/\b(for|while)\s*\(/g) || []).length;
  if (loopCount > 0) {
    patterns.push({
      type: 'loop',
      count: loopCount,
      suggestion: 'Test con arrays vacíos, un elemento, múltiples elementos'
    });
  }
  
  // Detectar try/catch
  if (sourceCode.includes('try') && sourceCode.includes('catch')) {
    patterns.push({
      type: 'error-handling',
      suggestion: 'Test que fuerce error en el try block'
    });
  }
  
  return patterns;
}

/**
 * Construye una assertion específica a partir del valor literal retornado
 */
function buildAssertionFromReturnValue(value) {
  if (value === 'true')  return 'expect(result).toBe(true)';
  if (value === 'false') return 'expect(result).toBe(false)';
  if (value === 'null')  return 'expect(result).toBeNull()';
  if (value === '0')     return 'expect(result).toBe(0)';
  if (/^\d+$/.test(value)) return `expect(result).toBe(${value})`;
  if (value.startsWith('"') || value.startsWith("'")) return 'expect(typeof result).toBe("string")';
  if (value.startsWith('[')) return 'expect(Array.isArray(result)).toBe(true)';
  if (value.startsWith('{')) return 'expect(result).toEqual(expect.objectContaining({}))';
  return 'expect(result).toBeDefined()';
}

/**
 * Verifica si es una función nativa
 */
function isNative(name) {
  const natives = [
    'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number',
    'Date', 'RegExp', 'Error', 'Promise', 'Symbol', 'Map', 'Set',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI',
    'decodeURI', 'setTimeout', 'setInterval', 'clearTimeout', 
    'clearInterval', 'fetch', 'require', 'import'
  ];
  return natives.includes(name);
}

/**
 * Genera tests específicos basados en el análisis del código fuente
 */
export function generateSpecificTests(sourceCode, atom, patterns) {
  const tests = [];
  
  // Agregar tests basados en patrones encontrados
  for (const pattern of patterns.patterns || []) {
    switch (pattern.type) {
      case 'return-value': {
        // Use the actual return value to build a precise assertion
        const assertion = buildAssertionFromReturnValue(pattern.value);
        tests.push({
          name: `should return ${pattern.value} for expected input`,
          type: 'return-value',
          inputs: {},
          assertion,
          source: 'code-analysis'
        });
        break;
      }

      case 'validation':
        tests.push({
          name: `should handle ${pattern.variable} = null/undefined`,
          type: 'edge-case',
          inputs: { [pattern.variable]: 'null' },
          assertion: `expect(() => ${atom.name}(null)).not.toThrow()`,
          source: 'code-analysis'
        });
        break;
        
      case 'condition':
        tests.push({
          name: `should handle ${pattern.variable} = ${pattern.value}`,
          type: 'condition-branch',
          inputs: { [pattern.variable]: /^\d+$/.test(pattern.value) ? pattern.value : `"${pattern.value}"` },
          assertion: 'expect(result).toBeDefined()',
          source: 'code-analysis'
        });
        break;
        
      case 'membership':
        tests.push({
          name: `should handle value "${pattern.value}"`,
          type: 'membership-test',
          inputs: {},
          assertion: 'expect(result).toBeDefined()',
          source: 'code-analysis'
        });
        break;
        
      case 'switch':
      case 'multi-branch':
        // Ya cubierto por branch-coverage
        break;
        
      case 'loop':
        tests.push({
          name: `should return empty result for empty array/collection`,
          type: 'empty-input',
          inputs: {},
          assertion: 'expect(Array.isArray(result) ? result : result).toBeDefined()',
          source: 'code-analysis'
        });
        tests.push({
          name: `should process single item array/collection`,
          type: 'single-item',
          inputs: {},
          assertion: 'expect(result).toBeDefined()',
          source: 'code-analysis'
        });
        break;
        
      case 'error-handling':
        tests.push({
          name: `should handle errors gracefully without propagating`,
          type: 'error-handling',
          inputs: {},
          assertion: `expect(() => ${atom.name}()).not.toThrow()`,
          source: 'code-analysis'
        });
        break;
    }
  }
  
  // Agregar ejemplos basados en literales encontrados
  for (const example of patterns.examples || []) {
    if (example.type === 'object') {
      const keys = Object.keys(example.value).slice(0, 3);
      const containsExpr = keys.length > 0
        ? `expect.objectContaining({ ${keys.map(k => `${k}: expect.anything()`).join(', ')} })`
        : 'expect.objectContaining({})';
      tests.push({
        name: `should handle object input ${JSON.stringify(example.value).slice(0, 30)}`,
        type: 'literal-example',
        inputs: example.value,
        assertion: `expect(result).toEqual(${containsExpr})`,
        source: 'code-literal'
      });
    }
  }
  
  return tests;
}

export default {
  readFunctionSource,
  analyzeSourceForTests,
  generateSpecificTests
};
