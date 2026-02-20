/**
 * @fileoverview value-flow-analyzer.js
 * 
 * Value Flow Analyzer - Analyze data flow through symbols
 * Part of the analysis library extracted from ast-analyzer.js
 * 
 * @module analysis/value-flow-analyzer
 */

import fs from 'fs/promises';
import path from 'path';
import { findCallSites } from './call-graph-analyzer.js';

/**
 * Analiza el flujo de valores de un símbolo
 */
export async function analyzeValueFlow(projectPath, targetFile, symbolName) {
  const flow = {
    symbol: symbolName,
    file: targetFile,
    type: null, // 'function', 'variable', 'class'
    inputs: [],
    outputs: [],
    dependencies: [],
    consumers: []
  };

  try {
    const content = await fs.readFile(
      path.join(projectPath, targetFile),
      'utf-8'
    );

    // Detectar tipo de símbolo - handle ALL patterns
    const patterns = [
      // export function name / export async function name
      { regex: new RegExp(`export\\s+(?:async\\s+)?function\\s+${symbolName}`), type: 'function' },
      // function name (non-exported)
      { regex: new RegExp(`(?:^|\\n)\\s*(?:async\\s+)?function\\s+${symbolName}\\s*\\(`), type: 'function' },
      // Class method: name( / async name(
      { regex: new RegExp(`(?:^|\\n)\\s*(?:async\\s+)?${symbolName}\\s*\\(`), type: 'function' },
      // Arrow: const name = (...) => / const name = async (...) =>
      { regex: new RegExp(`(?:const|let|var)\\s+${symbolName}\\s*=\\s*(?:async\\s+)?(?:\\([^)]*\\)|\\w+)\\s*=>`), type: 'function' },
      // export class name
      { regex: new RegExp(`export\\s+class\\s+${symbolName}`), type: 'class' },
      // class name (non-exported)  
      { regex: new RegExp(`(?:^|\\n)\\s*class\\s+${symbolName}`), type: 'class' },
      // export const/let/var name
      { regex: new RegExp(`export\\s+(?:const|let|var)\\s+${symbolName}`), type: 'variable' },
    ];

    for (const p of patterns) {
      if (p.regex.test(content)) {
        flow.type = p.type;
        break;
      }
    }

    // Para funciones, extraer parámetros y return
    if (flow.type === 'function') {
      // Try multiple patterns for parameter extraction
      const funcPatterns = [
        // export function name(params) / function name(params) / async function name(params)
        new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${symbolName}\\s*\\(([^)]*)\\)`, 'i'),
        // Class method: name(params) / async name(params)
        new RegExp(`(?:async\\s+)?${symbolName}\\s*\\(([^)]*)\\)\\s*\\{`, 'i'),
        // Arrow: const name = (params) =>
        new RegExp(`(?:const|let|var)\\s+${symbolName}\\s*=\\s*(?:async\\s+)?\\(([^)]*)\\)\\s*=>`, 'i'),
        // Arrow single param: const name = param =>
        new RegExp(`(?:const|let|var)\\s+${symbolName}\\s*=\\s*(?:async\\s+)?(\\w+)\\s*=>`, 'i'),
      ];

      let funcMatch = null;
      for (const fp of funcPatterns) {
        funcMatch = content.match(fp);
        if (funcMatch) break;
      }

      if (funcMatch) {
        // Parsear parámetros
        const params = funcMatch[1].split(',').map(p => {
          const [name, type] = p.split(':').map(s => s.trim());
          return {
            name: name.replace(/\?\s*$/, '').replace(/\s*=\s*.+$/, ''),
            optional: p.includes('?') || p.includes('='),
            type: type || 'unknown'
          };
        }).filter(p => p.name);

        flow.inputs = params;

        // Buscar return statements
        const funcBody = extractFunctionBody(content, symbolName);
        if (funcBody) {
          const returnMatches = funcBody.match(/return\s+([^;]+);?/g);
          if (returnMatches) {
            flow.outputs = returnMatches.map(r => ({
              statement: r.trim(),
              type: inferType(r)
            }));
          }
        }
      }

      // Buscar dependencias (otras funciones llamadas)
      const body = extractFunctionBody(content, symbolName);
      if (body) {
        const calls = body.match(/\b(\w+)\s*\(/g) || [];
        const nativeMethods = new Set([
          // Array methods
          'concat', 'copyWithin', 'entries', 'every', 'fill', 'filter', 'find', 'findIndex', 'flat',
          'flatMap', 'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf', 'map', 'pop',
          'push', 'reduce', 'reduceRight', 'reverse', 'shift', 'slice', 'some', 'sort', 'splice',
          'toLocaleString', 'toString', 'unshift', 'values', 'at', 'length',
          // String methods
          'charAt', 'charCodeAt', 'codePointAt', 'endsWith', 'fromCharCode', 'fromCodePoint',
          'includes', 'indexOf', 'lastIndexOf', 'localeCompare', 'match', 'matchAll', 'normalize',
          'padEnd', 'padStart', 'raw', 'repeat', 'replace', 'replaceAll', 'search', 'slice', 'split',
          'startsWith', 'substring', 'substr', 'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase',
          'toString', 'toUpperCase', 'trim', 'trimEnd', 'trimStart', 'valueOf',
          // Object methods
          'assign', 'create', 'defineProperties', 'defineProperty', 'entries', 'freeze',
          'fromEntries', 'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors', 'getOwnPropertyNames',
          'getOwnPropertySymbols', 'getPrototypeOf', 'is', 'isExtensible', 'isFrozen', 'isSealed',
          'keys', 'preventExtensions', 'seal', 'setPrototypeOf', 'values', 'hasOwnProperty',
          'isPrototypeOf', 'propertyIsEnumerable',
          // Promise methods
          'all', 'allSettled', 'any', 'race', 'reject', 'resolve', 'then', 'catch', 'finally',
          // JSON methods
          'parse', 'stringify',
          // Math methods (commonly used without Math.)
          'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil',
          'clz32', 'cos', 'cosh', 'exp', 'expm1', 'floor', 'fround', 'hypot', 'imul', 'log',
          'log1p', 'log2', 'log10', 'max', 'min', 'pow', 'random', 'round', 'sign', 'sin',
          'sinh', 'sqrt', 'tan', 'tanh', 'trunc',
          // Console methods
          'log', 'error', 'warn', 'info', 'debug', 'table', 'trace', 'dir', 'time', 'timeEnd',
          'assert', 'clear', 'count', 'countReset', 'group', 'groupEnd', 'groupCollapsed',
          // Other common globals
          'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'encodeURIComponent',
          'decodeURI', 'decodeURIComponent', 'escape', 'unescape', 'eval', 'Number', 'String',
          'Boolean', 'Array', 'Object', 'Date', 'RegExp', 'Error', 'Map', 'Set', 'WeakMap',
          'WeakSet', 'Symbol', 'BigInt', 'Proxy', 'Reflect', 'Intl', 'setTimeout', 'setInterval',
          'clearTimeout', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'
        ]);
        
        flow.dependencies = [...new Set(calls.map(c => c.replace('(', '').trim()))]
          .filter(c => !['if', 'while', 'for', 'switch', 'catch', 'return'].includes(c))
          .map(c => ({
            name: c,
            type: nativeMethods.has(c) ? 'native' : 'unknown',
            context: nativeMethods.has(c) ? 'JavaScript built-in' : 'Project or external'
          }))
          .slice(0, 10);
      }
    }

    // Encontrar consumidores (quién usa el valor retornado)
    const callGraph = await findCallSites(projectPath, targetFile, symbolName);
    if (!callGraph.error && callGraph.callSites) {
      flow.consumers = callGraph.callSites.map(site => ({
        file: site.file,
        line: site.line,
        context: site.context
      }));
    }

    return flow;

  } catch (error) {
    return { error: error.message };
  }
}

// ============ UTILIDADES ============

async function findAllJsFiles(dir, files = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        await findAllJsFiles(fullPath, files);
      } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip directories that can't be read
  }

  return files;
}

function parseSignature(signature) {
  if (!signature || signature.trim() === '') return [];

  return signature.split(',').map(param => {
    const [name, type] = param.split(':').map(s => s.trim());
    return {
      name: name.replace(/\?\s*$/, '').replace(/\s*=\s*.+$/, ''),
      optional: param.includes('?') || param.includes('='),
      type: type || 'unknown'
    };
  }).filter(p => p.name);
}

function extractArguments(callLine) {
  const match = callLine.match(/\((.*)\)/);
  if (!match) return [];

  // Split by comma, handling nested parentheses
  const args = [];
  let depth = 0;
  let current = '';

  for (const char of match[1]) {
    if (char === '(') depth++;
    if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) args.push(current.trim());
  return args;
}

function extractFunctionBody(content, functionName) {
  // Try multiple patterns
  const patterns = [
    new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`, 'i'),
    new RegExp(`async\\s+function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`, 'i'),
    new RegExp(`(?:async\\s+)?${functionName}\\s*\\([^)]*\\)\\s*\\{`, 'i'),
    new RegExp(`${functionName}\\s*=\\s*(?:async\\s+)?\\([^)]*\\)\\s*=>\\s*\\{`, 'i'),
  ];

  let match = null;
  for (const regex of patterns) {
    match = content.match(regex);
    if (match) break;
  }
  if (!match) return null;

  const startIndex = match.index + match[0].length;
  let depth = 1;
  let endIndex = startIndex;

  while (depth > 0 && endIndex < content.length) {
    if (content[endIndex] === '{') depth++;
    if (content[endIndex] === '}') depth--;
    endIndex++;
  }

  return content.slice(startIndex, endIndex - 1);
}

function inferType(returnStatement) {
  const value = returnStatement.replace(/^return\s+/, '').trim();

  if (/^\d+$/.test(value)) return 'number';
  if (/^["'`].*["'`]$/.test(value)) return 'string';
  if (/^(true|false)$/.test(value)) return 'boolean';
  if (/^\[/.test(value)) return 'array';
  if (/^\{/.test(value)) return 'object';
  if (/^new\s+/.test(value)) return 'instance';
  if (/^(async\s+)?(\(?[^)]*\)?\s*=>|\{)/.test(value)) return 'function';

  return 'unknown';
}
