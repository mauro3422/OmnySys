/**
 * Function extraction analyzer
 * @module mcp/tools/suggest-refactoring/extract-analyzer
 */

import { generateBlockName } from './naming-helpers.js';

/**
 * Identifica bloques lógicos dentro de una función
 * @param {Object} atom - Atom metadata
 * @returns {Array} - Array of logical blocks
 */
export function identifyLogicalBlocks(atom) {
  const blocks = [];
  
  if (atom.dataFlow?.transformations) {
    const transformations = atom.dataFlow.transformations;
    
    let currentBlock = null;
    for (const t of transformations) {
      if (!currentBlock || t.line - currentBlock.endLine > 5) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = {
          lineRange: [t.line, t.line],
          operations: [t.operation],
          suggestedName: generateBlockName(t)
        };
      } else {
        currentBlock.endLine = t.line;
        currentBlock.operations.push(t.operation);
      }
    }
    if (currentBlock) blocks.push(currentBlock);
  }
  
  return blocks;
}

/**
 * Analiza si una función debería extraerse
 * @param {Array} atoms - Array of atoms
 * @param {string} filePath - File path
 * @returns {Array} - Array of suggestions
 */
export function analyzeExtractFunction(atoms, filePath) {
  const suggestions = [];
  
  for (const atom of atoms) {
    // Funciones muy largas (>80 LOC)
    if (atom.linesOfCode > 80) {
      const blocks = identifyLogicalBlocks(atom);
      if (blocks.length >= 2) {
        suggestions.push({
          type: 'extract_function',
          severity: 'medium',
          target: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line,
          currentLOC: atom.linesOfCode,
          suggestion: `Extract ${blocks.length} logical blocks into separate functions`,
          blocks: blocks.map(b => ({
            name: b.suggestedName,
            lines: b.lineRange,
            reason: b.reason
          })),
          benefit: `Reduce complexity from ${atom.complexity} to ~${Math.ceil(atom.complexity / blocks.length)} per function`
        });
      }
    }
    
    // Código duplicado dentro de la misma función
    if (atom.dna?.operationSequence) {
      const duplicates = findInternalDuplicates(atom.dna.operationSequence);
      if (duplicates.length > 0) {
        suggestions.push({
          type: 'extract_helper',
          severity: 'low',
          target: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line,
          suggestion: `Extract repeated operations into helper function`,
          duplicates: duplicates,
          benefit: 'DRY - Eliminate internal duplication'
        });
      }
    }
  }
  
  return suggestions;
}

function findInternalDuplicates(operations) {
  const seen = new Map();
  const duplicates = [];
  
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const key = JSON.stringify(op);
    
    if (seen.has(key)) {
      duplicates.push({
        operation: op,
        firstAt: seen.get(key),
        duplicateAt: i,
        repeated: true
      });
    } else {
      seen.set(key, i);
    }
  }
  
  return duplicates;
}
