/**
 * @fileoverview Atomic/Molecular Tools
 * 
 * Herramientas para análisis atómico (funciones) y molecular (archivos)
 *
 * ARCHITECTURE: Layer C (MCP Tool Layer)
 * Exposes atomic/molecular data to AI agents via MCP protocol
 * 
 * @module unified-server/tools/atomic-tools
 * @phase Layer C (MCP Tools)
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 */

import {
  getAtomDetails,
  getFileAnalysisWithAtoms
} from '../../../../layer-c-memory/query/apis/file-api.js';

import { getRiskReason, getRiskLevel, calculateRiskMetrics } from './helpers/risk-helpers.js';
import { getRecommendation, getAllRecommendations } from './recommendations/archetype-recommendations.js';
import {
  formatAtomBasic,
  formatSideEffects,
  formatCallGraph,
  formatQualityMetrics,
  formatFunctionSummary,
  formatInsights
} from './formatters/atom-formatters.js';

/**
 * Obtiene detalles de una función específica (átomo)
 * @param {string} filePath - Ruta del archivo
 * @param {string} functionName - Nombre de la función
 * @returns {Promise<Object>} - Detalles atómicos
 */
export async function getFunctionDetails(filePath, functionName) {
  try {
    const atom = await getAtomDetails(this.projectPath, filePath, functionName, this.cache);

    if (!atom) {
      return {
        error: `Function '${functionName}' not found in ${filePath}`,
        suggestion: 'The function may not be analyzed yet or is an anonymous function'
      };
    }

    return {
      atom: formatAtomBasic(atom),
      archetype: atom.archetype,
      sideEffects: formatSideEffects(atom),
      callGraph: formatCallGraph(atom),
      quality: formatQualityMetrics(atom)
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Obtiene resumen molecular de un archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Resumen molecular
 */
export async function getMoleculeSummary(filePath) {
  try {
    const data = await getFileAnalysisWithAtoms(this.projectPath, filePath, this.cache);

    if (!data) {
      return { error: `File not found: ${filePath}` };
    }

    if (!data.atoms || data.atoms.length === 0) {
      return {
        filePath,
        atomsAvailable: false,
        message: 'No atomic analysis available for this file'
      };
    }

    return {
      filePath,
      atomsAvailable: true,
      molecule: data.derived,
      stats: data.stats,
      atoms: data.atoms.map(formatFunctionSummary),
      insights: formatInsights(data)
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Analiza el impacto de cambiar una función
 * @param {string} filePath - Ruta del archivo
 * @param {string} functionName - Nombre de la función
 * @returns {Promise<Object>} - Análisis de impacto
 */
export async function analyzeFunctionChange(filePath, functionName) {
  try {
    const atom = await getAtomDetails(this.projectPath, filePath, functionName);

    if (!atom) {
      return { error: `Function '${functionName}' not found` };
    }

    return {
      function: functionName,
      file: filePath,
      atomId: atom.id,
      directImpact: {
        callers: atom.calledBy || [],
        callerCount: atom.calledBy?.length || 0,
        isExported: atom.isExported
      },
      dependencies: {
        calls: atom.calls || [],
        externalCalls: atom.externalCalls || [],
        internalCalls: atom.internalCalls || []
      },
      risk: calculateRiskMetrics(atom),
      recommendation: getRecommendation(atom.archetype?.type)
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Obtiene lista de funciones atómicas de un archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object>} - Lista de funciones
 */
export async function getAtomicFunctions(filePath) {
  try {
    const data = await getFileAnalysisWithAtoms(this.projectPath, filePath, this.cache);
    
    if (!data || !data.atoms || data.atoms.length === 0) {
      return {
        filePath,
        functions: [],
        message: 'No atomic analysis available. Run analysis first.',
        suggestion: 'Use /restart command to reload with new atomic analysis'
      };
    }
    
    const byArchetype = {};
    const exported = [];
    const internal = [];
    
    for (const atom of data.atoms) {
      const archetype = atom.archetype?.type || 'unknown';
      if (!byArchetype[archetype]) {
        byArchetype[archetype] = [];
      }
      byArchetype[archetype].push(formatFunctionSummary(atom));
      
      if (atom.isExported) {
        exported.push({
          name: atom.name,
          archetype: archetype,
          complexity: atom.complexity,
          calledBy: atom.calledBy?.length || 0
        });
      } else {
        internal.push({
          name: atom.name,
          archetype: archetype,
          complexity: atom.complexity,
          calledBy: atom.calledBy?.length || 0
        });
      }
    }
    
    return {
      filePath,
      summary: {
        total: data.atoms.length,
        exported: exported.length,
        internal: internal.length,
        archetypes: Object.keys(byArchetype)
      },
      byArchetype,
      exported: exported.sort((a, b) => b.calledBy - a.calledBy),
      internal: internal.sort((a, b) => b.calledBy - a.calledBy),
      insights: {
        deadCode: byArchetype['dead-function'] || [],
        hotPaths: byArchetype['hot-path'] || [],
        fragile: byArchetype['fragile-network'] || [],
        godFunctions: byArchetype['god-function'] || []
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

export default {
  getFunctionDetails,
  getMoleculeSummary,
  analyzeFunctionChange,
  getAtomicFunctions
};
