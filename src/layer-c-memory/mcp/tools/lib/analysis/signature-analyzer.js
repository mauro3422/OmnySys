/**
 * @fileoverview signature-analyzer.js
 * 
 * Signature Analyzer - Analyze function signatures and detect breaking changes
 * Part of the analysis library extracted from ast-analyzer.js
 * 
 * @module analysis/signature-analyzer
 */

import fs from 'fs/promises';
import path from 'path';
import { findCallSites } from './call-graph-analyzer.js';

/**
 * Analiza la firma de una función y encuentra usos inconsistentes
 */
export async function analyzeFunctionSignature(projectPath, targetFile, symbolName, newSignature) {
  const results = {
    currentSignature: null,
    usages: [],
    breakingChanges: [],
    recommendations: []
  };
  
  try {
    // Leer archivo objetivo
    const content = await fs.readFile(
      path.join(projectPath, targetFile),
      'utf-8'
    );
    
    // Extraer firma actual
    const functionRegex = new RegExp(
      `export\\s+(?:async\\s+)?function\\s+${symbolName}\\s*\\(([^)]*)\\)`,
      'i'
    );
    
    const match = content.match(functionRegex);
    if (match) {
      results.currentSignature = `${symbolName}(${match[1]})`;
    }
    
    // Encontrar todos los call sites
    const callGraph = await findCallSites(projectPath, targetFile, symbolName);
    
    if (callGraph.error) {
      return { error: callGraph.error };
    }
    
    results.usages = callGraph.callSites || [];
    
    // Analizar cada uso para detectar breaking changes
    if (newSignature) {
      const newParams = parseParameters(newSignature);
      
      for (const usage of results.usages) {
        const callParams = extractCallParameters(usage.code);
        
        if (callParams.length !== newParams.length) {
          results.breakingChanges.push({
            location: `${usage.file}:${usage.line}`,
            issue: `Parameter count mismatch`,
            expected: newParams.length,
            actual: callParams.length,
            code: usage.code
          });
        }
      }
      
      if (results.breakingChanges.length > 0) {
        results.recommendations.push({
          type: 'breaking_change',
          severity: 'high',
          message: `${results.breakingChanges.length} usages will break with new signature`,
          action: 'Update all call sites before changing signature'
        });
      }
    }
    
    return results;
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Parsea parámetros de una firma
 */
function parseParameters(signature) {
  const match = signature.match(/\(([^)]*)\)/);
  if (!match) return [];
  
  return match[1]
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => {
      const [name, type] = p.split(':').map(s => s.trim());
      return { name, type: type || 'any' };
    });
}

/**
 * Extrae parámetros de una llamada
 */
function extractCallParameters(callCode) {
  const match = callCode.match(/\(([^)]*)\)/);
  if (!match) return [];
  
  return match[1]
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);
}
