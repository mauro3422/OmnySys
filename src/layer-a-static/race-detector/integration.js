/**
 * @fileoverview Race Detector Integration
 * 
 * Integra el detector de race conditions con el sistema molecular
 * 
 * @module race-detector/integration
 */

import { RaceConditionDetector } from './index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:integration');



/**
 * Analiza un proyecto completo para race conditions
 * 
 * @param {Object} projectData - Datos del proyecto (de Phase 3)
 * @returns {Object} - Race conditions detectadas
 */
export async function analyzeProjectRaces(projectData) {
  logger.info('[RaceDetector] Analyzing project for race conditions...');
  
  const detector = new RaceConditionDetector(projectData);
  const results = detector.detect();
  
  logger.info(`[RaceDetector] Found ${results.races.length} races, ${results.warnings.length} warnings`);
  
  return results;
}

/**
 * Enriquece datos del proyecto con información de races
 * 
 * @param {Object} projectData - Datos del proyecto
 * @param {Object} raceResults - Resultados de detección
 * @returns {Object} - Datos enriquecidos
 */
export function enrichProjectWithRaces(projectData, raceResults) {
  if (!projectData) {
    return {
      raceConditions: raceResults,
      _meta: {
        raceDetectionVersion: '4.0.0',
        raceAnalysisAt: new Date().toISOString()
      }
    };
  }
  
  return {
    ...projectData,
    raceConditions: raceResults,
    
    // Agregar metadatos
    _meta: {
      ...projectData._meta,
      raceDetectionVersion: '4.0.0',
      raceAnalysisAt: new Date().toISOString()
    }
  };
}

/**
 * Obtiene races para un módulo específico
 * 
 * @param {string} moduleName - Nombre del módulo
 * @param {Object} raceResults - Resultados de detección
 * @returns {Array} - Races del módulo
 */
export function getRacesByModule(moduleName, raceResults) {
  if (!raceResults || !raceResults.races) return [];
  
  return raceResults.races.filter(race =>
    race.accesses.some(access => access.module === moduleName)
  );
}

/**
 * Obtiene races para un archivo específico
 * 
 * @param {string} filePath - Ruta del archivo
 * @param {Object} raceResults - Resultados de detección
 * @returns {Array} - Races del archivo
 */
export function getRacesByFile(filePath, raceResults) {
  if (!raceResults || !raceResults.races) return [];
  
  return raceResults.races.filter(race =>
    race.accesses.some(access => access.file === filePath)
  );
}

/**
 * Obtiene races para una función específica
 * 
 * @param {string} atomId - ID del átomo
 * @param {Object} raceResults - Resultados de detección
 * @returns {Array} - Races de la función
 */
export function getRacesByFunction(atomId, raceResults) {
  if (!raceResults || !raceResults.races) return [];
  
  return raceResults.races.filter(race =>
    race.accesses.some(access => access.atom === atomId)
  );
}

/**
 * Genera reporte de races para un estado específico
 * 
 * @param {string} stateKey - Clave del estado
 * @param {Object} raceResults - Resultados de detección
 * @returns {Object} - Reporte detallado
 */
export function generateStateReport(stateKey, raceResults) {
  const races = raceResults.races.filter(r => r.stateKey === stateKey);
  
  if (races.length === 0) {
    return null;
  }
  
  const accesses = races.flatMap(r => r.accesses);
  
  return {
    stateKey,
    raceCount: races.length,
    severity: Math.max(...races.map(r => 
      ['low', 'medium', 'high', 'critical'].indexOf(r.severity)
    )),
    accesses: accesses.map(a => ({
      function: a.atomName,
      module: a.module,
      file: a.file,
      type: a.type,
      line: a.line
    })),
    suggestedFix: generateSuggestedFix(races[0])
  };
}

/**
 * Genera sugerencia de fix para un race
 */
function generateSuggestedFix(race) {
  switch (race.type) {
    case 'WW':
      return 'Use atomic operations or implement locking mechanism';
    case 'RW':
      return 'Add synchronization before write operations or use immutable updates';
    case 'IE':
      return 'Use singleton pattern with proper initialization check or lazy initialization with locks';
    case 'EH':
      return 'Ensure event handlers are properly synchronized or use event queue';
    default:
      return 'Review concurrent access patterns and consider adding synchronization';
  }
}

/**
 * Exporta resultados en formato JSON
 */
export function exportRaceResults(raceResults, format = 'json') {
  if (!raceResults) {
    throw new Error('raceResults is required');
  }
  
  switch (format) {
    case 'json':
      return JSON.stringify(raceResults, null, 2);
      
    case 'markdown':
      return exportToMarkdown(raceResults);
      
    case 'csv':
      return exportToCSV(raceResults);
      
    default:
      return JSON.stringify(raceResults, null, 2);
  }
}

/**
 * Exporta a formato Markdown
 */
function exportToMarkdown(raceResults) {
  if (!raceResults) {
    throw new Error('raceResults is required');
  }
  
  const summary = raceResults.summary || { totalRaces: 0, totalWarnings: 0, sharedStateItems: 0, bySeverity: {}, byType: {} };
  const races = raceResults.races || [];
  
  let md = '# Race Conditions Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Total Races:** ${summary.totalRaces}\n`;
  md += `- **Total Warnings:** ${summary.totalWarnings}\n`;
  md += `- **Shared State Items:** ${summary.sharedStateItems}\n\n`;
  
  md += '## Races by Severity\n\n';
  for (const [severity, count] of Object.entries(summary.bySeverity)) {
    md += `- ${severity}: ${count}\n`;
  }
  md += '\n';
  
  md += '## Races by Type\n\n';
  for (const [type, count] of Object.entries(summary.byType)) {
    md += `- ${type}: ${count}\n`;
  }
  md += '\n';
  
  md += '## Detailed Races\n\n';
  for (const race of races) {
    md += `### ${race.id} (${race.severity})\n\n`;
    md += `- **Type:** ${race.type}\n`;
    md += `- **State:** ${race.stateKey}\n`;
    md += `- **Description:** ${race.description}\n\n`;
    
    md += '**Accesses:**\n';
    for (const access of race.accesses || []) {
      md += `- ${access.atomName} (${access.module}) - Line ${access.line}\n`;
    }
    md += '\n';
  }
  
  return md;
}

/**
 * Exporta a formato CSV
 */
function exportToCSV(raceResults) {
  if (!raceResults) {
    throw new Error('raceResults is required');
  }
  
  const headers = ['ID', 'Type', 'Severity', 'State', 'Function1', 'Module1', 'Function2', 'Module2', 'Description'];
  
  const rows = (raceResults.races || []).map(race => {
    const [a1, a2] = race.accesses || [];
    return [
      race.id,
      race.type,
      race.severity,
      race.stateKey,
      a1?.atomName || '',
      a1?.module || '',
      a2?.atomName || '',
      a2?.module || '',
      race.description
    ].join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

export default {
  analyzeProjectRaces,
  enrichProjectWithRaces,
  getRacesByModule,
  getRacesByFile,
  getRacesByFunction,
  generateStateReport,
  exportRaceResults
};
