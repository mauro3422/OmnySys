/**
 * Tool: get_risk_assessment
 * Returns a risk assessment of the entire project
 */

import { getProjectMetadata } from '#layer-a/query/index.js';
import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:risk');



export async function get_risk_assessment(args, context) {
  const { minSeverity = 'medium' } = args;
  const { projectPath } = context;
  
  logger.error(`[Tool] get_risk_assessment("${minSeverity}")`);

  try {
    // Obtener metadata del proyecto
    const metadata = await getProjectMetadata(projectPath);
    
    // Calcular estadísticas de riesgo desde los archivos analizados
    const fileIndex = metadata?.fileIndex || {};
    const totalFiles = Object.keys(fileIndex).length;
    
    // Analizar archivos por severidad
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    const hotspots = [];
    
    // Revisar archivos con alto riesgo basado en métricas
    for (const [filePath, fileInfo] of Object.entries(fileIndex)) {
      const riskFactors = [];
      
      // Factor 1: Muchos exports + Muchos dependientes = Alto acoplamiento
      if (fileInfo.exports?.length > 5 && fileInfo.usedBy?.length > 10) {
        highCount++;
        riskFactors.push('high-coupling');
      }
      
      // Factor 2: Archivos huérfanos (sin dependientes)
      if (fileInfo.exports?.length > 0 && (!fileInfo.usedBy || fileInfo.usedBy.length === 0)) {
        mediumCount++;
        riskFactors.push('orphan-module');
      }
      
      // Factor 3: Archivos con state management
      if (fileInfo.semanticAnalysis?.sharedState?.writes?.length > 0) {
        highCount++;
        riskFactors.push('state-management');
      }
      
      // Agregar a hotspots si tiene factores de riesgo
      if (riskFactors.length > 0) {
        hotspots.push({
          file: filePath,
          factors: riskFactors,
          exports: fileInfo.exports?.length || 0,
          dependents: fileInfo.usedBy?.length || 0
        });
      }
    }
    
    // Ordenar hotspots por riesgo
    hotspots.sort((a, b) => b.factors.length - a.factors.length);
    
    // Filtrar por severidad mínima
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const minLevel = severityOrder[minSeverity] || 1;
    
    let filteredHotspots = hotspots;
    if (minSeverity === 'high') {
      filteredHotspots = hotspots.filter(h => 
        h.factors.includes('high-coupling') || h.factors.includes('state-management')
      );
    }
    
    const totalIssues = criticalCount + highCount + mediumCount + lowCount;
    
    return {
      summary: {
        totalFiles,
        totalIssues,
        criticalCount,
        highCount,
        mediumCount,
        lowCount
      },
      topRiskFiles: filteredHotspots.slice(0, 10),
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
