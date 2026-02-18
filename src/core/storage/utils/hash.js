import crypto from 'crypto';

/**
 * Calcula hash de un archivo para detectar cambios
 *
 * @param {string} filePath - Ruta del archivo
 * @returns {string} - Hash de 8 caracteres
 */
export function calculateFileHash(filePath) {
  return crypto.createHash('md5').update(filePath).digest('hex').substring(0, 8);
}
