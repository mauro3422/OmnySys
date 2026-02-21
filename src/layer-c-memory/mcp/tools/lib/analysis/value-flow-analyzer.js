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

// Métodos nativos de JS — se excluyen del análisis de dependencias
const NATIVE_METHODS = new Set([
  'concat','copyWithin','entries','every','fill','filter','find','findIndex','flat','flatMap',
  'forEach','includes','indexOf','join','keys','lastIndexOf','map','pop','push','reduce',
  'reduceRight','reverse','shift','slice','some','sort','splice','unshift','values','at',
  'charAt','charCodeAt','endsWith','fromCharCode','localeCompare','match','matchAll','normalize',
  'padEnd','padStart','repeat','replace','replaceAll','search','split','startsWith','substring',
  'toLowerCase','toUpperCase','trim','trimEnd','trimStart','valueOf','assign','create','freeze',
  'fromEntries','getOwnPropertyNames','getPrototypeOf','is','keys','seal','setPrototypeOf',
  'all','allSettled','any','race','reject','resolve','then','catch','finally',
  'parse','stringify',
  'abs','ceil','floor','max','min','pow','random','round','sqrt','trunc',
  'log','error','warn','info','debug','table','trace',
  'parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent',
  'Number','String','Boolean','Array','Object','Date','RegExp','Error','Map','Set',
  'setTimeout','setInterval','clearTimeout','clearInterval'
]);

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
        const callMatches = body.match(/\b(\w+)\s*\(/g) || [];
        flow.dependencies = [...new Set(callMatches.map(c => c.replace('(', '').trim()))]
          .filter(c => !['if', 'while', 'for', 'switch', 'catch', 'return'].includes(c))
          .filter(c => !NATIVE_METHODS.has(c))
          .map(c => {
            // Intentar extraer los argumentos reales de la llamada
            const callLine = body.match(new RegExp(`\\b${c}\\s*\\([^)]*\\)`))?.[0] || '';
            const args = callLine ? extractArguments(callLine) : [];
            return {
              name: c,
              type: 'unknown',
              context: 'Project or external',
              args: args.slice(0, 5)
            };
          })
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

/**
 * Extrae los argumentos de una línea de llamada respetando paréntesis anidados.
 * Ej: "fn(a, fn2(b, c), d)" → ["a", "fn2(b, c)", "d"]
 */
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
