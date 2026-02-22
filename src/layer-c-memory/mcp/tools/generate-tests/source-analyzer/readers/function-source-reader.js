/**
 * @fileoverview Function Source Reader - Lee el código fuente de funciones
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Lee el código fuente de una función
 * @param {string} projectPath - Ruta del proyecto
 * @param {string} filePath - Ruta del archivo
 * @param {Object} atom - Información del átomo (con line y endLine)
 * @returns {string|null} - Código fuente de la función o null
 */
export async function readFunctionSource(projectPath, filePath, atom) {
  if (!atom.line || !atom.endLine) {
    return null;
  }

  try {
    const fullPath = path.join(projectPath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    // Extraer líneas de la función (1-indexed a 0-indexed)
    const functionLines = lines.slice(atom.line - 1, atom.endLine);
    return functionLines.join('\n');
  } catch (error) {
    return null;
  }
}
