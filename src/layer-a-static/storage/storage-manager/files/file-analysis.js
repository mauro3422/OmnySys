import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = '.omnysysdata';

/**
 * Guarda el análisis completo de un archivo individual
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo (ej: 'src/UI.js')
 * @param {object} fileData - Datos completos del archivo
 * @returns {string} - Ruta del archivo guardado
 */
export async function saveFileAnalysis(rootPath, filePath, fileData) {
  const dataPath = path.join(rootPath, DATA_DIR);

  // Crear estructura de directorios que refleja el proyecto
  const fileDir = path.dirname(filePath);
  const targetDir = path.join(dataPath, 'files', fileDir);
  await fs.mkdir(targetDir, { recursive: true });

  // Guardar archivo con nombre original + .json
  const fileName = path.basename(filePath);
  const targetPath = path.join(targetDir, `${fileName}.json`);

  // Verificar si existe análisis previo para preservar campos importantes
  let existingData = {};
  try {
    const existingContent = await fs.readFile(targetPath, 'utf-8');
    existingData = JSON.parse(existingContent);
  } catch {
    // No existe archivo previo, usar objeto vacío
  }

  // Merge: El nuevo análisis tiene prioridad, pero preservar campos importantes del anterior
  // si el nuevo NO los tiene (ej: análisis incremental sin LLM no debe borrar llmInsights previos)
  const mergedData = {
    ...existingData,
    ...fileData,
    // Si el nuevo análisis NO tiene llmInsights, preservar el existente
    llmInsights: fileData.llmInsights !== undefined ? fileData.llmInsights : existingData.llmInsights,
    // Si el nuevo análisis NO tiene riskScore, preservar el existente
    riskScore: fileData.riskScore !== undefined ? fileData.riskScore : existingData.riskScore,
    // Si el nuevo análisis NO tiene quality, preservar el existente
    quality: fileData.quality !== undefined ? fileData.quality : existingData.quality
  };

  await fs.writeFile(targetPath, JSON.stringify(mergedData, null, 2));

  return targetPath;
}
