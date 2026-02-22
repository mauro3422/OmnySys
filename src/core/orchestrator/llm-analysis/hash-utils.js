import fs from 'fs/promises';
import crypto from 'crypto';

/**
 * Calcula hash MD5 del contenido de un archivo
 * @param {string} fullPath - Ruta absoluta al archivo
 * @returns {Promise<string|null>} - Hash MD5 o null si hay error
 */
export async function calculateContentHash(fullPath) {
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch {
    return null;
  }
}
