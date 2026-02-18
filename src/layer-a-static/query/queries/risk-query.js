/**
 * @fileoverview risk-query.js
 *
 * Consultas de evaluación de riesgos
 * INTEGRADO: Ahora incluye eventos de Tunnel Vision
 *
 * @module query/queries/risk-query
 */

import path from 'path';
import { getDataDirectory } from '#core/storage/index.js';
import { readJSON, fileExists } from '../readers/json-reader.js';

/**
 * Obtiene el assessment de riesgos completo
 * INTEGRADO: Incluye eventos de Tunnel Vision
 * 
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>}
 */
export async function getRiskAssessment(rootPath) {
  const dataPath = getDataDirectory(rootPath);
  const risksDir = path.join(dataPath, 'risks');
  const assessmentPath = path.join(risksDir, 'assessment.json');

  // 1. Leer assessment base
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
    // Merge with defaults to ensure all required properties exist
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

  // 2. 🆕 INTEGRACIÓN: Leer eventos de Tunnel Vision
  const tunnelVisionStats = await getTunnelVisionStats(rootPath);
  
  // 3. 🆕 MERGE: Combinar datos de tunnel vision con risk assessment
  if (tunnelVisionStats && tunnelVisionStats.totalEvents > 0) {
    // Agregar eventos CRITICAL de tunnel vision
    // NOTA: Los eventos usan 'modifiedFile' y 'affectedFiles.total'
    const criticalEvents = tunnelVisionStats.events?.filter(e => e.severity === 'CRITICAL') || [];
    
    if (criticalEvents.length > 0) {
      // Actualizar contadores
      assessment.report.summary.criticalCount += criticalEvents.length;
      
      // Agregar archivos críticos de tunnel vision
      const tunnelVisionCriticalFiles = criticalEvents.map(e => ({
        file: e.modifiedFile || e.file,
        severity: 'CRITICAL',
        reason: `Tunnel Vision: Afecta ${e.affectedFiles?.total || e.affectedCount || 0} archivos`,
        affectedCount: e.affectedFiles?.total || e.affectedCount || 0,
        source: 'tunnel-vision',
        timestamp: e.timestamp
      }));
      
      // Merge sin duplicados
      const existingFiles = new Set(assessment.report.criticalRiskFiles?.map(f => f.file) || []);
      for (const file of tunnelVisionCriticalFiles) {
        if (!existingFiles.has(file.file)) {
          assessment.report.criticalRiskFiles = assessment.report.criticalRiskFiles || [];
          assessment.report.criticalRiskFiles.push(file);
        }
      }
      
      // 🆕 Agregar metadata de integración
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
