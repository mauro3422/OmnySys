/**
 * @fileoverview risk-query.js
 *
 * Consultas de evaluación de riesgos
 * MIGRADO: Ahora usa SQLite en lugar de archivos JSON
 *
 * @module query/queries/risk-query
 */

import path from 'path';
import { getDataDirectory } from '#layer-c/storage/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { readJSON, fileExists } from '../readers/json-reader.js';

/**
 * Obtiene el assessment de riesgos completo
 * MIGRADO: Ahora consulta SQLite primero, fallback a JSON legacy
 * 
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>}
 */
export async function getRiskAssessment(rootPath) {
  // 1. PRIORIDAD: Consultar SQLite
  try {
    const repo = getRepository(rootPath);
    if (repo && repo.db) {
      const riskRows = repo.db.prepare(`
        SELECT file_path, risk_score, risk_level, factors_json, 
               shared_state_count, external_deps_count, complexity_score, 
               propagation_score, assessed_at
        FROM risk_assessments 
        WHERE risk_level IN ('critical', 'high', 'medium')
        ORDER BY risk_score DESC
      `).all();
      
      if (riskRows && riskRows.length > 0) {
        const criticalRiskFiles = [];
        const highRiskFiles = [];
        const mediumRiskFiles = [];
        
        let criticalCount = 0, highCount = 0, mediumCount = 0;
        
        for (const row of riskRows) {
          const fileRisk = {
            file: row.file_path,
            severity: row.risk_level.toUpperCase(),
            score: row.risk_score,
            reason: JSON.parse(row.factors_json || '[]').slice(0, 3).map(f => f.type || 'unknown').join(', ') || 'Multiple risk factors',
            factors: JSON.parse(row.factors_json || '[]'),
            source: 'sqlite'
          };
          
          if (row.risk_level === 'critical') {
            criticalRiskFiles.push(fileRisk);
            criticalCount++;
          } else if (row.risk_level === 'high') {
            highRiskFiles.push(fileRisk);
            highCount++;
          } else {
            mediumRiskFiles.push(fileRisk);
            mediumCount++;
          }
        }
        
        // 2. 🆕 INTEGRACIÓN: Tunnel Vision stats (legacy fallback)
        const tunnelVisionStats = await getTunnelVisionStats(rootPath);
        
        let assessment = {
          report: {
            summary: {
              criticalCount,
              highCount,
              mediumCount,
              lowCount: 0,
              totalFiles: riskRows.length
            },
            criticalRiskFiles,
            highRiskFiles,
            mediumRiskFiles
          },
          scores: {}
        };
        
        // Merge tunnel vision if available
        if (tunnelVisionStats && tunnelVisionStats.totalEvents > 0) {
          const criticalEvents = tunnelVisionStats.events?.filter(e => e.severity === 'CRITICAL') || [];
          if (criticalEvents.length > 0) {
            assessment.report.summary.criticalCount += criticalEvents.length;
            const tunnelVisionCriticalFiles = criticalEvents.map(e => ({
              file: e.modifiedFile || e.file,
              severity: 'CRITICAL',
              reason: `Tunnel Vision: Afecta ${e.affectedFiles?.total || e.affectedCount || 0} archivos`,
              affectedCount: e.affectedFiles?.total || e.affectedCount || 0,
              source: 'tunnel-vision',
              timestamp: e.timestamp
            }));
            assessment.report.criticalRiskFiles = [...assessment.report.criticalRiskFiles, ...tunnelVisionCriticalFiles];
            assessment.tunnelVision = {
              integrated: true,
              totalEvents: tunnelVisionStats.totalEvents,
              criticalEvents: criticalEvents.length,
              lastUpdated: tunnelVisionStats.lastUpdated
            };
          }
        }
        
        return assessment;
      }
    }
  } catch (err) {
    console.error(`[getRiskAssessment] SQLite error: ${err.message}`);
  }
  
  // Fallback legacy: JSON files
  return getRiskAssessmentLegacy(rootPath);
}

/**
 * Fallback legacy: Lee risk assessment desde JSON
 * @deprecated Usar getRiskAssessment() que prioriza SQLite
 */
async function getRiskAssessmentLegacy(rootPath) {
  const dataPath = getDataDirectory(rootPath);
  const risksDir = path.join(dataPath, 'risks');
  const assessmentPath = path.join(risksDir, 'assessment.json');

  let assessment = {
    report: {
      summary: {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        totalFiles: 0
      },
      criticalRiskFiles: [],
      highRiskFiles: [],
      mediumRiskFiles: []
    },
    scores: {}
  };

  if (await fileExists(assessmentPath)) {
    const fileData = await readJSON(assessmentPath);
    assessment = {
      report: {
        summary: {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          totalFiles: 0,
          ...fileData.report?.summary
        },
        criticalRiskFiles: fileData.report?.criticalRiskFiles || [],
        highRiskFiles: fileData.report?.highRiskFiles || [],
        mediumRiskFiles: fileData.report?.mediumRiskFiles || []
      },
      scores: fileData.scores || {}
    };
  }

  const tunnelVisionStats = await getTunnelVisionStats(rootPath);
  if (tunnelVisionStats && tunnelVisionStats.totalEvents > 0) {
    const criticalEvents = tunnelVisionStats.events?.filter(e => e.severity === 'CRITICAL') || [];
    if (criticalEvents.length > 0) {
      assessment.report.summary.criticalCount += criticalEvents.length;
      const tunnelVisionCriticalFiles = criticalEvents.map(e => ({
        file: e.modifiedFile || e.file,
        severity: 'CRITICAL',
        reason: `Tunnel Vision: Afecta ${e.affectedFiles?.total || e.affectedCount || 0} archivos`,
        affectedCount: e.affectedFiles?.total || e.affectedCount || 0,
        source: 'tunnel-vision',
        timestamp: e.timestamp
      }));
      assessment.report.criticalRiskFiles = [...assessment.report.criticalRiskFiles, ...tunnelVisionCriticalFiles];
      assessment.tunnelVision = {
        integrated: true,
        totalEvents: tunnelVisionStats.totalEvents,
        criticalEvents: criticalEvents.length,
        lastUpdated: tunnelVisionStats.lastUpdated
      };
    }
  }

  return assessment;
}

/**
 * 🆕 NUEVO: Obtiene estadísticas de Tunnel Vision
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object|null>}
 */
async function getTunnelVisionStats(rootPath) {
  try {
    const statsPath = path.join(rootPath, '.omnysysdata', 'tunnel-vision-stats.json');
    
    if (await fileExists(statsPath)) {
      const stats = await readJSON(statsPath);
      
      // También leer eventos individuales
      const eventsPath = path.join(rootPath, '.omnysysdata', 'tunnel-vision-events.jsonl');
      let events = [];
      
      if (await fileExists(eventsPath)) {
        const fs = await import('fs/promises');
        const content = await fs.readFile(eventsPath, 'utf-8');
        events = content
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      }
      
      return {
        ...stats,
        events
      };
    }
    
    return null;
  } catch (error) {
    // Si falla, retornar null sin romper el sistema
    return null;
  }
}
