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
    
    // Detectar tipo de símbolo
    if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${symbolName}`).test(content)) {
      flow.type = 'function';
    } else if (new RegExp(`export\\s+class\\s+${symbolName}`).test(content)) {
      flow.type = 'class';
    } else if (new RegExp(`export\\s+(?:const|let|var)\\s+${symbolName}`).test(content)) {
      flow.type = 'variable';
    }
    
    // Para funciones, extraer parámetros y return
    if (flow.type === 'function') {
      const funcMatch = content.match(
        new RegExp(`(?:export\\s+(?:async\\s+)?)?function\\s+${symbolName}\\s*\\(([^)]*)\\)(?:\\s*:\\s*([^\\{]+))?`, 'i')
      );
      
      if (funcMatch) {
        // Parsear parámetros
        const params = funcMatch[1].split(',').map(p => {
          const [name, type] = p.split(':').map(s => s.trim());
          return { 
            name: name.replace(/\?\s*$/, ''), 
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
        flow.dependencies = [...new Set(calls.map(c => c.replace('(', '').trim()))]
          .filter(c => !['if', 'while', 'for', 'switch', 'catch'].includes(c))
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
  const regex = new RegExp(
    `function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`,
    'i'
  );
  
  const match = content.match(regex);
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
