/**
 * Tool: get_risk_assessment
 * Returns a risk assessment of the entire project
 */

import { getProjectMetadata } from '#layer-c/query/apis/project-api.js';
import { getRiskAssessment } from '#layer-c/query/apis/risk-api.js';
import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:risk');



export async function get_risk_assessment(args, context) {
  const { minSeverity = 'medium' } = args;
  const { projectPath } = context;
  
  logger.error(`[Tool] get_risk_assessment("${minSeverity}")`);

  try {
    // 🆕 INTEGRADO: Obtener risk assessment completo (incluye Tunnel Vision)
    const assessment = await getRiskAssessment(projectPath);
    
    // Obtener metadata del proyecto
    const metadata = await getProjectMetadata(projectPath);
    
    // Calcular estadísticas de riesgo desde los archivos analizados
    const fileIndex = metadata?.fileIndex || {};
    const totalFiles = Object.keys(fileIndex).length;
    
    // 🆕 Usar contadores del assessment integrado (incluye Tunnel Vision)
    let criticalCount = assessment?.report?.summary?.criticalCount || 0;
    let highCount = assessment?.report?.summary?.highCount || 0;
    let mediumCount = assessment?.report?.summary?.mediumCount || 0;
    let lowCount = assessment?.report?.summary?.lowCount || 0;
    
    // 🆕 Incluir archivos críticos de Tunnel Vision
    const hotspots = [];
    
    // Agregar archivos críticos del assessment (incluye Tunnel Vision)
    if (assessment?.report?.criticalRiskFiles) {
      for (const file of assessment.report.criticalRiskFiles) {
        hotspots.push({
          file: file.file,
          severity: file.severity,
          reason: file.reason,
          source: file.source || 'risk-analysis',
          affectedCount: file.affectedCount,
          timestamp: file.timestamp
        });
      }
    }
    
    // Agregar archivos de alto riesgo
    if (assessment?.report?.highRiskFiles) {
      for (const file of assessment.report.highRiskFiles) {
        hotspots.push({
          file: file.file,
          severity: file.severity,
          reason: file.explanation || 'High risk file',
          source: 'risk-analysis'
        });
      }
    }
    
    // Revisar archivos con alto riesgo basado en métricas adicionales
    for (const [filePath, fileInfo] of Object.entries(fileIndex)) {
      const riskFactors = [];
      
      // Factor 1: Muchos exports + Muchos dependientes = Alto acoplamiento
      if (fileInfo.exports?.length > 5 && fileInfo.usedBy?.length > 10) {
        riskFactors.push('high-coupling');
      }
      
      // Factor 2: Archivos huérfanos (sin dependientes)
      if (fileInfo.exports?.length > 0 && (!fileInfo.usedBy || fileInfo.usedBy.length === 0)) {
        riskFactors.push('orphan-module');
      }
      
      // Factor 3: Archivos con state management
      if (fileInfo.semanticAnalysis?.sharedState?.writes?.length > 0) {
        riskFactors.push('state-management');
      }
      
      // Agregar a hotspots si tiene factores de riesgo y no está ya incluido
      if (riskFactors.length > 0) {
        const alreadyIncluded = hotspots.some(h => h.file === filePath);
        if (!alreadyIncluded) {
          hotspots.push({
            file: filePath,
            factors: riskFactors,
            severity: riskFactors.includes('high-coupling') || riskFactors.includes('state-management') ? 'high' : 'medium',
            exports: fileInfo.exports?.length || 0,
            dependents: fileInfo.usedBy?.length || 0,
            source: 'metrics-analysis'
          });
        }
      }
    }
    
    // Ordenar hotspots por severidad
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    hotspots.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
    
    // Filtrar por severidad mínima
    const minLevel = severityOrder[minSeverity] || 1;
    const filteredHotspots = hotspots.filter(h => severityOrder[h.severity] >= minLevel);
    
    // totalIssues = solo medium+ (low no es un issue accionable)
    const totalIssues = criticalCount + highCount + mediumCount;

    return {
      summary: {
        totalFiles,
        totalIssues,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        tunnelVisionIntegrated: true
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
