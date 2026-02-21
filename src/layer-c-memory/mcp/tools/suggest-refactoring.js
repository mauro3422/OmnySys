/**
 * MCP Tool: suggest_refactoring
 * Sugiere mejoras de refactoring basadas en análisis del código
 */

import { getAllAtoms } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';
import { analyzeExtractFunction } from './suggest-refactoring/extract-analyzer.js';
import { analyzeNaming } from './suggest-refactoring/naming-analyzer.js';
import { analyzeErrorHandling } from './suggest-refactoring/error-analyzer.js';
import { analyzePerformance } from './suggest-refactoring/performance-analyzer.js';
import { analyzeFileSize } from './suggest-refactoring/file-analyzer.js';
import { analyzeCohesion } from './suggest-refactoring/cohesion-analyzer.js';

const logger = createLogger('OmnySys:suggest:refactoring');

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

export default { suggest_refactoring };
