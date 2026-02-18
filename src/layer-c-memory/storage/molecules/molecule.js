import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = '.omnysysdata';

/**
 * Guarda estructura molecular de un archivo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {object} molecularData - Estructura molecular (atoms + derivations)
 * @returns {string} - Ruta del archivo guardado
 */
export async function saveMolecule(rootPath, filePath, molecularData) {
  const dataPath = path.join(rootPath, DATA_DIR);

  // Crear directorio molecules/ si no existe
  const moleculesDir = path.join(dataPath, 'molecules');
  await fs.mkdir(moleculesDir, { recursive: true });

  // Crear estructura de directorios que refleja el proyecto
  const fileDir = path.dirname(filePath);
  const targetDir = path.join(moleculesDir, fileDir);
  await fs.mkdir(targetDir, { recursive: true });

  // Guardar archivo con nombre original + .molecule.json
  const fileName = path.basename(filePath);
  const targetPath = path.join(targetDir, `${fileName}.molecule.json`);

  await fs.writeFile(targetPath, JSON.stringify(molecularData, null, 2));

  return targetPath;
}

/**
 * Carga estructura molecular de un archivo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {object|null} - Molecular data o null si no existe
 */
export async function loadMolecule(rootPath, filePath) {
  const dataPath = path.join(rootPath, DATA_DIR);
  const moleculesDir = path.join(dataPath, 'molecules');

  // 🆕 FIX: Normalizar filePath para que sea relativo al rootPath
  let normalizedPath = filePath;
  // Normalizar separadores de path para comparación cross-platform
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');

  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }

  const fileDir = path.dirname(normalizedPath);
  const fileName = path.basename(normalizedPath);
  const targetPath = path.join(moleculesDir, fileDir, `${fileName}.molecule.json`);

  try {
    const content = await fs.readFile(targetPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}
