/**
 * Guarda estructura molecular en SQLite (derivado de atoms)
 * Ya no escribe archivos JSON - molecules se derivan de atoms
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @param {object} molecularData - Estructura molecular (no se guarda - derivado de atoms)
 * @returns {boolean} - true (simulado)
 */
export async function saveMolecule(rootPath, filePath, molecularData) {
  // Los molecules se derivan on-demand desde la tabla atoms
  // No necesitamos guardar archivos JSON redundantes
  return true;
}

/**
 * Carga estructura molecular (derivado de atoms en SQLite)
 * Ya no lee archivos JSON
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {null} - null (debe derivarse de atoms)
 */
export async function loadMolecule(rootPath, filePath) {
  // Los molecules se derivan de atoms, no se cargan desde JSON
  return null;
}
