import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = '.omnysysdata';

/**
 * Guarda el risk assessment completo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {object} riskAssessment - Risk assessment con scores y report
 * @returns {string} - Ruta del archivo guardado
 */
export async function saveRiskAssessment(rootPath, riskAssessment) {
  const dataPath = path.join(rootPath, DATA_DIR);
  const risksDir = path.join(dataPath, 'risks');

  const assessmentPath = path.join(risksDir, 'assessment.json');
  await fs.writeFile(assessmentPath, JSON.stringify({
    ...riskAssessment,
    generatedAt: new Date().toISOString()
  }, null, 2));

  return assessmentPath;
}
