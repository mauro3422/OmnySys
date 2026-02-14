/**
 * @fileoverview Semantic Issue Analyzer - Detecta issues semánticos
 * 
 * Responsabilidad Única (SRP): Analizar y detectar issues semánticos en el código.
 * 
 * @module pipeline/enhancers/analyzers
 */

/**
 * Issue semántico detectado
 * @typedef {Object} SemanticIssue
 * @property {string} [file] - Archivo afectado
 * @property {string} type - Tipo de issue
 * @property {string} severity - Severidad (high, medium, low)
 * @property {string} message - Mensaje descriptivo
 * @property {Object} details - Detalles adicionales
 */

/**
 * Collects semantic issues from the enhanced data.
 * Issues are notable patterns that may need attention.
 * 
 * @param {Object} enhanced - Enhanced system map
 * @param {Object} semanticResults - Resultados del análisis semántico
 * @returns {Object} Issues y estadísticas
 */
export function collectSemanticIssues(enhanced, semanticResults) {
  const issues = [];

  // Files with many semantic connections (potential god objects)
  for (const [filePath, fileData] of Object.entries(enhanced.files || {})) {
    const connCount = fileData.semanticConnections?.length || 0;
    const riskScore = fileData.riskScore?.total || 0;

    if (connCount >= 8) {
      issues.push({
        file: filePath,
        type: 'high-semantic-coupling',
        severity: 'high',
        message: `File has ${connCount} semantic connections`,
        details: { connectionCount: connCount, riskScore }
      });
    } else if (connCount >= 4) {
      issues.push({
        file: filePath,
        type: 'medium-semantic-coupling',
        severity: 'medium',
        message: `File has ${connCount} semantic connections`,
        details: { connectionCount: connCount, riskScore }
      });
    }

    if (riskScore >= 8) {
      issues.push({
        file: filePath,
        type: 'critical-risk',
        severity: 'high',
        message: `Critical risk score: ${riskScore}/10`,
        details: { riskScore, breakdown: fileData.riskScore?.breakdown }
      });
    }
  }

  // Global state shared between many files
  const globalConnections = semanticResults.globalConnections || [];
  if (globalConnections.length >= 5) {
    issues.push({
      type: 'excessive-global-state',
      severity: 'medium',
      message: `${globalConnections.length} global state connections detected`,
      details: { count: globalConnections.length }
    });
  }

  const bySeverity = { high: 0, medium: 0, low: 0 };
  for (const issue of issues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
  }

  return {
    issues,
    stats: {
      totalIssues: issues.length,
      bySeverity
    }
  };
}

/**
 * Detecta archivos con alto acoplamiento semántico
 * @param {Object} files - Mapa de archivos
 * @param {number} threshold - Umbral de conexiones (default: 8)
 * @returns {SemanticIssue[]} Issues detectados
 */
export function detectHighCoupling(files, threshold = 8) {
  const issues = [];
  
  for (const [filePath, fileData] of Object.entries(files || {})) {
    const connCount = fileData.semanticConnections?.length || 0;
    
    if (connCount >= threshold) {
      issues.push({
        file: filePath,
        type: 'high-semantic-coupling',
        severity: connCount >= threshold * 2 ? 'high' : 'medium',
        message: `File has ${connCount} semantic connections (potential god object)`,
        details: { 
          connectionCount: connCount,
          threshold 
        }
      });
    }
  }
  
  return issues;
}

/**
 * Detecta archivos con riesgo crítico
 * @param {Object} files - Mapa de archivos
 * @param {number} threshold - Umbral de riesgo (default: 8)
 * @returns {SemanticIssue[]} Issues detectados
 */
export function detectCriticalRisk(files, threshold = 8) {
  const issues = [];
  
  for (const [filePath, fileData] of Object.entries(files || {})) {
    const riskScore = fileData.riskScore?.total || 0;
    
    if (riskScore >= threshold) {
      issues.push({
        file: filePath,
        type: 'critical-risk',
        severity: riskScore >= 9 ? 'critical' : 'high',
        message: `Critical risk score: ${riskScore}/10`,
        details: { 
          riskScore, 
          threshold,
          breakdown: fileData.riskScore?.breakdown 
        }
      });
    }
  }
  
  return issues;
}
