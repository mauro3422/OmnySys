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

  if (atom.dataFlow?.transformations?.length > 0) {
    const transformations = atom.dataFlow.transformations;

    let currentBlock = null;
    for (const t of transformations) {
      const lineNum = t.line || 0;
      const operationType = t.type || t.kind || t.to || 'unknown';

      if (!currentBlock || lineNum - currentBlock.endLine > 5) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = {
          lineRange: [lineNum, lineNum],
          endLine: lineNum,
          operations: [operationType],
          suggestedName: generateBlockName(t)
        };
      } else {
        currentBlock.endLine = lineNum;
        currentBlock.lineRange[1] = lineNum;
        currentBlock.operations.push(operationType);
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
    // Funciones muy largas (> 80 LOC) con complejidad alta — candidatas para extracción
    if (atom.linesOfCode > 80 && atom.complexity > 5) {
      suggestions.push({
        type: 'extract_function',
        severity: atom.linesOfCode > 150 ? 'high' : 'medium',
        target: atom.id,
        name: atom.name,
        file: atom.filePath,
        line: atom.line,
        currentLOC: atom.linesOfCode,
        suggestion: `Function has ${atom.linesOfCode} LOC and complexity ${atom.complexity} — extract into smaller functions`,
        reason: `Large functions are harder to test and understand. Consider splitting into ${Math.ceil(atom.linesOfCode / 40)} smaller functions.`,
        benefit: `Reduce complexity from ${atom.complexity} to ~${Math.ceil(atom.complexity / 3)} per function`
      });
    }

    // Complejidad ciclomática muy alta (> 15) sin ser especialmente larga
    if (atom.complexity > 15 && atom.linesOfCode <= 80) {
      suggestions.push({
        type: 'reduce_complexity',
        severity: atom.complexity > 25 ? 'high' : 'medium',
        target: atom.id,
        name: atom.name,
        file: atom.filePath,
        line: atom.line,
        currentComplexity: atom.complexity,
        suggestion: `High cyclomatic complexity (${atom.complexity}) — simplify conditions`,
        reason: `Functions with complexity > 15 have elevated defect probability and are hard to test.`,
        benefit: 'Reduce branches to simplify logic flow'
      });
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
