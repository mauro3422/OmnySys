import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = '.omnysysdata';

/**
 * Guarda el análisis atómico de una función
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {string} functionName - Nombre de la función
 * @param {object} atomData - Metadata del átomo
 * @returns {string} - Ruta del archivo guardado
 */
export async function saveAtom(rootPath, filePath, functionName, atomData) {
  const dataPath = path.join(rootPath, DATA_DIR);

  // Crear directorio atoms/ si no existe
  const atomsDir = path.join(dataPath, 'atoms');
  await fs.mkdir(atomsDir, { recursive: true });

  // Crear estructura: atoms/{filePath}/{functionName}.json
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  const targetDir = path.join(atomsDir, fileDir, fileName);
  await fs.mkdir(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, `${functionName}.json`);

  await fs.writeFile(targetPath, JSON.stringify(atomData, null, 2));

  return targetPath;
}

/**
 * Carga todos los átomos de un archivo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {array} - Array de atoms
 */
export async function loadAtoms(rootPath, filePath) {
  const dataPath = path.join(rootPath, DATA_DIR);
  const atomsDir = path.join(dataPath, 'atoms');

  // 🆕 FIX: Normalizar filePath para que sea relativo al rootPath
  let normalizedPath = filePath;
  // Normalizar separadores de path para comparación cross-platform
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');

  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }

  const fileDir = path.dirname(normalizedPath);
  const fileName = path.basename(normalizedPath, path.extname(normalizedPath));
  const targetDir = path.join(atomsDir, fileDir, fileName);

  try {
    const files = await fs.readdir(targetDir);
    const atoms = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(targetDir, file), 'utf-8');
        atoms.push(JSON.parse(content));
      }
    }

    return atoms;
  } catch {
    return [];
  }
}
