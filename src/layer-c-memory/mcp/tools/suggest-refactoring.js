/**
 * MCP Tool: suggest_refactoring
 * Sugiere mejoras de refactoring basadas en análisis del código
 */

import { getAllAtoms, getAtomsInFile, enrichAtomsWithRelations } from '#layer-c/storage/index.js';
import { createLogger } from '../../../utils/logger.js';
import { analyzeExtractFunction } from './suggest-refactoring/extract-analyzer.js';
import { analyzeNaming } from './suggest-refactoring/naming-analyzer.js';
import { analyzeErrorHandling } from './suggest-refactoring/error-analyzer.js';
import { analyzePerformance } from './suggest-refactoring/performance-analyzer.js';
import { analyzeFileSize } from './suggest-refactoring/file-analyzer.js';
import { analyzeCohesion } from './suggest-refactoring/cohesion-analyzer.js';

const logger = createLogger('OmnySys:suggest:refactoring');

function calculatePriority(suggestion, enrichedAtoms) {
  const severityScores = { high: 100, medium: 50, low: 10 };
  const typeScores = {
    'add_error_handling': 20,
    'optimize_loops': 15,
    'split_file': 10,
    'extract_function': 5
  };
  
  const baseScore = (severityScores[suggestion.severity] || 0) + (typeScores[suggestion.type] || 0);
  
  // ÁLGEBRA DE GRAFOS: Priorizar átomos con alta centralidad (HUBs)
  const atomName = suggestion.name || suggestion.target;
  const enrichedAtom = enrichedAtoms.find(a => a.name === atomName);
  const centralityBoost = enrichedAtom?.graph?.centralityClassification === 'HUB' ? 50 : 
                         enrichedAtom?.graph?.centralityClassification === 'BRIDGE' ? 25 : 0;
  
  return baseScore + centralityBoost;
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
    // 🚀 OPTIMIZADO: Si hay filePath, cargar solo átomos de ese archivo
    let atoms = filePath 
      ? await getAtomsInFile(projectPath, filePath)
      : await getAllAtoms(projectPath);
    
    // ÁLGEBRA DE GRAFOS: Enriquecer con centrality, propagation, risk
    const enrichedAtoms = await enrichAtomsWithRelations(atoms, {
      withStats: true,
      withCallers: false,
      withCallees: false
    }, projectPath);
    
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
    
    // Calcular prioridad con datos del grafo
    const prioritized = filtered.map(s => ({
      ...s,
      priority: calculatePriority(s, enrichedAtoms)
    })).sort((a, b) => b.priority - a.priority);
    
    return {
      summary: {
        totalSuggestions: allSuggestions.length,
        bySeverity: {
          high: allSuggestions.filter(s => s.severity === 'high').length,
          medium: allSuggestions.filter(s => s.severity === 'medium').length,
          low: allSuggestions.filter(s => s.severity === 'low').length
        },
        byType: countByType(allSuggestions),
        // ÁLGEBRA DE GRAFOS: Estadísticas del grafo
        graph: {
          hubs: enrichedAtoms.filter(a => a.graph?.centralityClassification === 'HUB').length,
          bridges: enrichedAtoms.filter(a => a.graph?.centralityClassification === 'BRIDGE').length,
          leaves: enrichedAtoms.filter(a => a.graph?.centralityClassification === 'LEAF').length,
          avgCentrality: (enrichedAtoms.reduce((sum, a) => sum + (a.graph?.centrality || 0), 0) / enrichedAtoms.length).toFixed(3),
          highRisk: enrichedAtoms.filter(a => a.graph?.riskLevel === 'HIGH').length
        }
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
