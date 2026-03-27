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

import {
  buildAtomicToolError,
  buildFunctionDetailsResponse,
  buildMoleculeSummaryResponse,
  buildFunctionImpactResponse,
  buildAtomicFunctionLists
} from './helpers/atomic-tool-helpers.js';

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

    return buildFunctionDetailsResponse(atom);
  } catch (error) {
    return buildAtomicToolError(error);
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

    return buildMoleculeSummaryResponse(filePath, data);
  } catch (error) {
    return buildAtomicToolError(error);
  }
}

/**
 * Analiza el impacto de cambiar una función
 * @param {string} filePath - Ruta del archivo
 * @param {string} functionName - Nombre de la función
 * @returns {Promise<Object>} - Análisis de impacto
 */
export async function getFunctionImpact(filePath, functionName) {
  try {
    const atom = await getAtomDetails(this.projectPath, filePath, functionName);

    if (!atom) {
      return { error: `Function '${functionName}' not found` };
    }

    return buildFunctionImpactResponse(filePath, functionName, atom);
  } catch (error) {
    return buildAtomicToolError(error);
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
    
    return buildAtomicFunctionLists(filePath, data.atoms);
  } catch (error) {
    return buildAtomicToolError(error);
  }
}

export default {
  getFunctionDetails,
  getMoleculeSummary,
  getFunctionImpact,
  getAtomicFunctions
};
