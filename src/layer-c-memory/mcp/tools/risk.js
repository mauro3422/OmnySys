/**
 * Tool: get_risk_assessment
 * Returns a risk assessment of the entire project
 * MIGRADO: Ahora usa SQLite en lugar de archivos JSON
 */

import { getAllAtoms, enrichAtomsWithRelations } from '#layer-c/storage/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:risk');

const SEVERITY = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

/**
 * Calcula el nivel de riesgo de un archivo basado en sus átomos
 */
function calculateFileRisk(atoms) {
  if (!atoms.length) return { severity: 'low', score: 0, factors: [] };
  
  const factors = [];
  let score = 0;
  
  // Factor 1: God functions (alta complejidad)
  const godFunctions = atoms.filter(a => a.complexity > 20);
  if (godFunctions.length > 0) {
    factors.push({ type: 'god-functions', count: godFunctions.length, severity: 'high' });
    score += godFunctions.length * 3;
  }
  
  // Factor 2: Alta complejidad promedio
  const avgComplexity = atoms.reduce((sum, a) => sum + (a.complexity || 0), 0) / atoms.length;
  if (avgComplexity > 10) {
    factors.push({ type: 'high-complexity', avg: avgComplexity.toFixed(1), severity: 'medium' });
    score += Math.floor(avgComplexity);
  }
  
  // Factor 3: Muchas funciones exportadas (alto acoplamiento)
  const exportedAtoms = atoms.filter(a => a.isExported);
  if (exportedAtoms.length > 10) {
    factors.push({ type: 'high-coupling', exports: exportedAtoms.length, severity: 'high' });
    score += exportedAtoms.length * 2;
  }
  
  // Factor 4: Alto riesgo de fragilidad (desde derived)
  const highFragility = atoms.filter(a => (a.derived?.fragilityScore || 0) > 0.3);
  if (highFragility.length > 0) {
    factors.push({ type: 'fragile', count: highFragility.length, severity: 'critical' });
    score += highFragility.length * 4;
  }
  
  // Factor 5: Funciones sin calls (posibles orphan)
  const orphanFunctions = atoms.filter(a => a.isExported && (!a.calls || a.calls.length === 0));
  if (orphanFunctions.length > 0 && atoms.length > 5) {
    factors.push({ type: 'orphan-functions', count: orphanFunctions.length, severity: 'medium' });
    score += orphanFunctions.length;
  }
  
  // Factor 6: Alto cambio (si está disponible)
  const highChangeFreq = atoms.filter(a => (a.changeFrequency || 0) > 5);
  if (highChangeFreq.length > 0) {
    factors.push({ type: 'frequently-changing', count: highChangeFreq.length, severity: 'medium' });
    score += highChangeFreq.length;
  }
  
  // Factor 7: ÁLGEBRA DE GRAFOS - Alto riesgo desde el grafo (centrality + propagation)
  const graphHighRisk = atoms.filter(a => a.graph?.riskLevel === 'HIGH');
  if (graphHighRisk.length > 0) {
    factors.push({ type: 'graph-high-risk', count: graphHighRisk.length, severity: 'critical' });
    score += graphHighRisk.length * 5;
  }
  
  // Factor 8: ÁLGEBRA DE GRAFOS - HUBs (muchos dependents)
  const hubs = atoms.filter(a => a.graph?.centralityClassification === 'HUB');
  if (hubs.length > 0) {
    factors.push({ type: 'graph-hubs', count: hubs.length, severity: 'high' });
    score += hubs.length * 3;
  }
  
  // Determinar severidad
  let severity = 'low';
  if (score >= 20) severity = 'critical';
  else if (score >= 10) severity = 'high';
  else if (score >= 5) severity = 'medium';
  
  return { severity, score, factors };
}

export async function get_risk_assessment(args, context) {
  const { minSeverity = 'medium' } = args;
  const { projectPath } = context;
  
  try {
    // Cargar todos los átomos desde SQLite
    let allAtoms = await getAllAtoms(projectPath);
    
    // ÁLGEBRA DE GRAFOS: Enriquecer con centrality, propagation, risk
    allAtoms = await enrichAtomsWithRelations(allAtoms, {
      withStats: true,
      withCallers: false,
      withCallees: false
    }, projectPath);
    
    if (!allAtoms || allAtoms.length === 0) {
      return {
        summary: {
          totalFiles: 0,
          totalIssues: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          tunnelVisionIntegrated: true
        },
        topRiskFiles: [],
        recommendation: 'No atoms found in database'
      };
    }
    
    // Agrupar átomos por archivo
    const atomsByFile = {};
    for (const atom of allAtoms) {
      const filePath = atom.filePath || atom.file;
      if (!atomsByFile[filePath]) {
        atomsByFile[filePath] = [];
      }
      atomsByFile[filePath].push(atom);
    }
    
    // Calcular riesgo por archivo
    const fileRisks = [];
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    
    for (const [filePath, atoms] of Object.entries(atomsByFile)) {
      const risk = calculateFileRisk(atoms);
      
      // Contar por severidad
      if (risk.severity === 'critical') criticalCount++;
      else if (risk.severity === 'high') highCount++;
      else if (risk.severity === 'medium') mediumCount++;
      else lowCount++;
      
      // Agregar a la lista si tiene factores de riesgo
      if (risk.factors.length > 0) {
        fileRisks.push({
          file: filePath,
          severity: risk.severity,
          score: risk.score,
          factors: risk.factors,
          atomCount: atoms.length,
          avgComplexity: (atoms.reduce((sum, a) => sum + (a.complexity || 0), 0) / atoms.length).toFixed(1),
          exportedFunctions: atoms.filter(a => a.isExported).length,
          source: 'sqlited-risk-analysis'
        });
      }
    }
    
    // Ordenar por severidad y score
    fileRisks.sort((a, b) => {
      const severityDiff = SEVERITY[b.severity] - SEVERITY[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.score - a.score;
    });
    
    // Filtrar por severidad mínima
    const minLevel = SEVERITY[minSeverity] || 1;
    const filteredRisks = fileRisks.filter(f => SEVERITY[f.severity] >= minLevel);
    
    const totalIssues = criticalCount + highCount + mediumCount;
    
    return {
      summary: {
        totalFiles: Object.keys(atomsByFile).length,
        totalIssues,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        tunnelVisionIntegrated: true
      },
      topRiskFiles: filteredRisks.slice(0, 10),
      recommendation:
        criticalCount > 0
          ? '🚨 Critical issues detected - Review high-risk files'
          : highCount > 5
          ? '⚠️ Multiple high-risk areas identified'
          : mediumCount > 10
          ? '💡 Several medium-risk files need attention'
          : '✓ Risk levels acceptable'
    };
  } catch (error) {
    logger.error(`Error in get_risk_assessment: ${error.message}`);
    return {
      summary: { totalFiles: 0, totalIssues: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 },
      topRiskFiles: [],
      recommendation: 'Unable to assess risk - error accessing project data',
      error: error.message
    };
  }
}
