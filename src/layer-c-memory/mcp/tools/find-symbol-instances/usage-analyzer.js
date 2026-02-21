/**
 * Usage analysis utilities
 * @module layer-c-memory/mcp/tools/find-symbol-instances/usage-analyzer
 */

import { isCallToInstance } from './instance-helper.js';

/**
 * Analiza quién importa/us cada instancia
 * @param {Array} atoms - Array of all atoms
 * @param {Array} instances - Array of symbol instances
 * @param {string} symbolName - Symbol name
 * @returns {Map} - Map of filePath to usage info
 */
export function analyzeUsage(atoms, instances, symbolName) {
  const usageMap = new Map();
  
  for (const instance of instances) {
    const filePath = instance.filePath;
    usageMap.set(filePath, {
      imports: [],
      calls: [],
      totalUsage: 0
    });
    
    for (const atom of atoms) {
      if (atom.imports) {
        for (const imp of atom.imports) {
          if (imp.source && imp.source.includes(filePath.replace('.js', ''))) {
            usageMap.get(filePath).imports.push({
              file: atom.filePath,
              atom: atom.name
            });
          }
        }
      }
      
      if (atom.calls) {
        for (const call of atom.calls) {
          const callName = typeof call === 'string' ? call : call.name;
          if (callName === symbolName) {
            if (isCallToInstance(atom, instance, symbolName)) {
              usageMap.get(filePath).calls.push({
                file: atom.filePath,
                atom: atom.name,
                line: call.line || 0
              });
            }
          }
        }
      }
    }
    
    const usage = usageMap.get(filePath);
    usage.totalUsage = usage.imports.length + usage.calls.length;
  }
  
  return usageMap;
}
