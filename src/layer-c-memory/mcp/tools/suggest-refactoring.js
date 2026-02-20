/**
 * MCP Tool: suggest_refactoring
 * Sugiere mejoras de refactoring basadas en análisis del código
 */

import { getAllAtoms } from '#layer-c/storage/index.js';
import { getFileAnalysis } from '#layer-c/query/apis/file-api.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:suggest:refactoring');

/**
 * Analiza si una función debería extraerse
 */
function analyzeExtractFunction(atoms, filePath) {
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

/**
 * Identifica bloques lógicos dentro de una función
 */
function identifyLogicalBlocks(atom) {
  const blocks = [];
  
  // Si tiene transformaciones de datos, cada transformación es un bloque
  if (atom.dataFlow?.transformations) {
    const transformations = atom.dataFlow.transformations;
    
    // Agrupar transformaciones consecutivas
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

function generateBlockName(transformation) {
  const op = transformation.operation;
  if (op.includes('filter')) return 'filter' + (transformation.to || 'Data');
  if (op.includes('map')) return 'transform' + (transformation.to || 'Data');
  if (op.includes('reduce')) return 'aggregate' + (transformation.to || 'Data');
  return 'process' + (transformation.to || 'Block');
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

/**
 * Sugiere renombrar variables/funciones con nombres poco claros
 */
function analyzeNaming(atoms) {
  const suggestions = [];
  const poorNames = [
    { pattern: /^[a-z]$/, reason: 'Single letter variable' },
    { pattern: /^(data|info|item|thing|stuff|temp|tmp)$/, reason: 'Generic/vague name' },
    { pattern: /^(handle|process|do|make)[A-Z]/, reason: 'Vague action verb' }
  ];
  
  for (const atom of atoms) {
    // Verificar nombre de función
    for (const { pattern, reason } of poorNames) {
      if (pattern.test(atom.name)) {
        suggestions.push({
          type: 'rename',
          severity: 'low',
          target: atom.id,
          currentName: atom.name,
          file: atom.filePath,
          line: atom.line,
          suggestion: `Consider more descriptive name`,
          reason: reason,
          suggestedName: generateBetterName(atom)
        });
        break;
      }
    }
    
    // Verificar parámetros
    if (atom.dataFlow?.inputs) {
      for (const input of atom.dataFlow.inputs) {
        for (const { pattern, reason } of poorNames) {
          if (pattern.test(input.name)) {
            suggestions.push({
              type: 'rename_parameter',
              severity: 'low',
              target: atom.id,
              functionName: atom.name,
              currentName: input.name,
              file: atom.filePath,
              line: atom.line,
              suggestion: `Rename parameter to be more descriptive`,
              reason: reason,
              context: `Parameter in ${atom.name}()`
            });
            break;
          }
        }
      }
    }
  }
  
  return suggestions;
}

function generateBetterName(atom) {
  // Basado en el propósito y arquetipo
  const purpose = atom.purpose;
  const archetype = atom.archetype?.type;
  
  if (archetype === 'utility') return atom.name + 'Utility';
  if (purpose === 'API_EXPORT') return 'handle' + atom.name.charAt(0).toUpperCase() + atom.name.slice(1);
  
  return atom.name + 'Refactored';
}

/**
 * Sugiere agregar manejo de errores
 */
function analyzeErrorHandling(atoms) {
  const suggestions = [];
  
  for (const atom of atoms) {
    // Funciones async sin try/catch
    if (atom.isAsync && !atom.hasErrorHandling) {
      const hasNetwork = atom.hasNetworkCalls;
      const hasFileOps = atom.calls?.some(c => c.name?.includes('readFile') || c.name?.includes('writeFile'));
      
      if (hasNetwork || hasFileOps) {
        suggestions.push({
          type: 'add_error_handling',
          severity: hasNetwork ? 'high' : 'medium',
          target: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line,
          suggestion: `Add try/catch for ${hasNetwork ? 'network' : 'file'} operations`,
          reason: hasNetwork ? 'Network calls can fail' : 'File operations can throw',
          currentState: 'No error handling detected'
        });
      }
    }
    
    // Funciones que retornan promesas sin await
    if (atom.calls?.some(c => c.type === 'promise' || c.name?.includes('Promise'))) {
      if (!atom.isAsync && !atom.calls.some(c => c.name === 'then' || c.name === 'catch')) {
        suggestions.push({
          type: 'handle_promises',
          severity: 'medium',
          target: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line,
          suggestion: 'Either await promises or handle with .catch()',
          reason: 'Unhandled promise rejections can crash the app'
        });
      }
    }
  }
  
  return suggestions;
}

/**
 * Sugiere mejoras de performance
 */
function analyzePerformance(atoms) {
  const suggestions = [];
  
  for (const atom of atoms) {
    // Nested loops
    if (atom.performance?.expensiveOps?.nestedLoops >= 2) {
      suggestions.push({
        type: 'optimize_loops',
        severity: atom.performance.expensiveOps.nestedLoops >= 3 ? 'high' : 'medium',
        target: atom.id,
        name: atom.name,
        file: atom.filePath,
        line: atom.line,
        suggestion: `Optimize ${atom.performance.expensiveOps.nestedLoops}x nested loops`,
        reason: `O(n^${atom.performance.expensiveOps.nestedLoops}) complexity detected`,
        alternatives: [
          'Use Map/Set for O(1) lookups',
          'Consider preprocessing data',
          'Use early exit conditions'
        ]
      });
    }
    
    // Funciones recursivas sin memoización
    if (atom.performance?.expensiveOps?.recursion && atom.calls?.some(c => c.name === atom.name)) {
      suggestions.push({
        type: 'add_memoization',
        severity: 'medium',
        target: atom.id,
        name: atom.name,
        file: atom.filePath,
        line: atom.line,
        suggestion: 'Add memoization to recursive function',
        reason: 'Recursive calls may recalculate same values',
        benefit: 'O(n) space for O(1) lookup time'
      });
    }
  }
  
  return suggestions;
}

/**
 * Sugiere dividir archivos grandes
 */
function analyzeFileSize(atoms, filePath) {
  const byFile = new Map();
  
  for (const atom of atoms) {
    if (!atom.filePath) continue;
    if (!byFile.has(atom.filePath)) {
      byFile.set(atom.filePath, { atoms: [], totalLOC: 0 });
    }
    byFile.get(atom.filePath).atoms.push(atom);
    byFile.get(atom.filePath).totalLOC += atom.linesOfCode || 0;
  }
  
  const suggestions = [];
  
  for (const [file, data] of byFile) {
    if (data.totalLOC > 300) {
      // Agrupar por arquetipo
      const byArchetype = new Map();
      for (const atom of data.atoms) {
        const arch = atom.archetype?.type || 'other';
        if (!byArchetype.has(arch)) byArchetype.set(arch, []);
        byArchetype.get(arch).push(atom);
      }
      
      if (byArchetype.size >= 2) {
        suggestions.push({
          type: 'split_file',
          severity: data.totalLOC > 500 ? 'high' : 'medium',
          target: file,
          currentLOC: data.totalLOC,
          suggestion: `Split file into ${byArchetype.size} modules by responsibility`,
          groupings: Array.from(byArchetype.entries()).map(([arch, atoms]) => ({
            archetype: arch,
            count: atoms.length,
            suggestedFile: `${file.replace('.js', '')}.${arch}.js`
          }))
        });
      }
    }
  }
  
  return suggestions;
}

/**
 * Sugiere mejorar la cohesión
 */
function analyzeCohesion(atoms) {
  const suggestions = [];
  
  for (const atom of atoms) {
    // Funciones que hacen demasiadas cosas diferentes
    if (atom.calls && atom.calls.length > 20) {
      const uniqueTypes = new Set(atom.calls.map(c => c.type));
      if (uniqueTypes.size >= 4) {
        suggestions.push({
          type: 'improve_cohesion',
          severity: 'medium',
          target: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line,
          suggestion: 'Split into focused functions by operation type',
          reason: `Function mixes ${uniqueTypes.size} different concerns`,
          callTypes: Array.from(uniqueTypes)
        });
      }
    }
  }
  
  return suggestions;
}

/**
 * Tool principal
 */
export async function suggest_refactoring(args, context) {
  const { filePath, severity = 'all', limit = 20 } = args;
  const { projectPath } = context;
  
  logger.info(`[Tool] suggest_refactoring("${filePath || 'all'}")`);
  
  try {
    let atoms = await getAllAtoms(projectPath);
    
    // Filtrar por archivo si se especifica
    if (filePath) {
      atoms = atoms.filter(a => a.filePath === filePath || a.filePath?.endsWith('/' + filePath));
    }
    
    const allSuggestions = [
      ...analyzeExtractFunction(atoms, filePath),
      ...analyzeNaming(atoms),
      ...analyzeErrorHandling(atoms),
      ...analyzePerformance(atoms),
      ...analyzeFileSize(atoms, filePath),
      ...analyzeCohesion(atoms)
    ];
    
    // Filtrar por severidad
    let filtered = allSuggestions;
    if (severity !== 'all') {
      filtered = allSuggestions.filter(s => s.severity === severity);
    }
    
    // Calcular prioridad
    const prioritized = filtered.map(s => ({
      ...s,
      priority: calculatePriority(s)
    })).sort((a, b) => b.priority - a.priority);
    
    return {
      summary: {
        totalSuggestions: allSuggestions.length,
        bySeverity: {
          high: allSuggestions.filter(s => s.severity === 'high').length,
          medium: allSuggestions.filter(s => s.severity === 'medium').length,
          low: allSuggestions.filter(s => s.severity === 'low').length
        },
        byType: countByType(allSuggestions)
      },
      suggestions: prioritized.slice(0, limit),
      topRecommendations: prioritized
        .filter(s => s.severity === 'high')
        .slice(0, 5)
        .map(s => ({
          action: s.type,
          target: s.name || s.target,
          file: s.file,
          reason: s.reason || s.suggestion
        }))
    };
  } catch (error) {
    logger.error(`[Tool] suggest_refactoring failed: ${error.message}`);
    return { error: error.message };
  }
}

function calculatePriority(suggestion) {
  const severityScores = { high: 100, medium: 50, low: 10 };
  const typeScores = {
    'add_error_handling': 20,
    'optimize_loops': 15,
    'split_file': 10,
    'extract_function': 5
  };
  
  return (severityScores[suggestion.severity] || 0) + (typeScores[suggestion.type] || 0);
}

function countByType(suggestions) {
  const counts = {};
  for (const s of suggestions) {
    counts[s.type] = (counts[s.type] || 0) + 1;
  }
  return counts;
}
