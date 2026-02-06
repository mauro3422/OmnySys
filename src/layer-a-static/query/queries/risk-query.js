/**
 * @fileoverview risk-query.js
 *
 * Consultas de evaluación de riesgos
 *
 * @module query/queries/risk-query
 */

import path from 'path';
import { getDataDirectory } from '../../storage/storage-manager.js';
import { readJSON, fileExists } from '../readers/json-reader.js';

/**
 * Obtiene el assessment de riesgos completo
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>}
 */
export async function getRiskAssessment(rootPath) {
  const dataPath = getDataDirectory(rootPath);
  const risksDir = path.join(dataPath, 'risks');
  const assessmentPath = path.join(risksDir, 'assessment.json');

  if (await fileExists(assessmentPath)) {
    return await readJSON(assessmentPath);
  }

  return {
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
}
