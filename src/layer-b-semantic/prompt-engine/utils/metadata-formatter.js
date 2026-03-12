/**
 * @fileoverview Metadata Formatter
 *
 * Formatea y compacta bloques de metadata para reducir tokens.
 * Elimina lineas vacias y valores por defecto innecesarios.
 *
 * @module prompt-engine/utils/metadata-formatter
 * @version 1.0.0
 */

import { escapeRegExp } from './regex-utils.js';

// Patrones de valores vacios a eliminar
const EMPTY_PATTERNS = [
  /^\s*[^:]+:\s*$/,
  /^\s*[^:]+:\s*\[\]\s*$/,
  /^\s*[^:]+:\s*\{\}\s*$/,
  /^\s*[^:]+:\s*false\s*$/,
  /^\s*[^:]+:\s*0\s*\(\s*\)\s*$/
];

/**
 * Verifica si una linea esta vacia o tiene valor por defecto
 * @param {string} line - Linea a verificar
 * @returns {boolean} - True si debe eliminarse
 */
function isEmptyLine(line) {
  const normalized = line.replace(/\s*\(\s*\)\s*$/, '').trim();
  return EMPTY_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Compacta un bloque de texto removiendo lineas vacias
 * @param {string} text - Texto a compactar
 * @returns {string} - Texto compactado
 */
export function compactBlock(text) {
  const lines = text.split(/\r?\n/);
  const compacted = [];

  for (const line of lines) {
    if (!isEmptyLine(line)) {
      const cleaned = line.replace(/\s*\(\s*\)\s*$/, '');
      compacted.push(cleaned);
    }
  }

  return compacted.join('\n');
}

/**
 * Compacta solo la seccion de metadata (antes del codigo)
 * @param {string} userPrompt - Prompt completo
 * @param {string} fileContentPlaceholder - Marcador de contenido
 * @returns {string} - Prompt con metadata compactada
 */
export function compactMetadataSection(userPrompt, fileContentPlaceholder) {
  if (!userPrompt.includes(fileContentPlaceholder)) {
    return compactBlock(userPrompt);
  }

  const parts = userPrompt.split(fileContentPlaceholder);
  const before = parts.shift() || '';
  const after = parts.join(fileContentPlaceholder);

  return `${compactBlock(before)}${fileContentPlaceholder}${after}`;
}

/**
 * Inserta el contenido del archivo reemplazando el placeholder
 * @param {string} prompt - Prompt con placeholder
 * @param {string} placeholder - Marcador a reemplazar
 * @param {string} content - Contenido a insertar
 * @returns {string} - Prompt final
 */
export function insertFileContent(prompt, placeholder, content) {
  return prompt.replace(new RegExp(escapeRegExp(placeholder), 'g'), content || '');
}

/**
 * Formatea metadata para visualizacion
 * @param {Object} metadata - Metadatos
 * @returns {string} - Representacion formateada
 */
export function formatMetadataForDisplay(metadata) {
  const lines = [];

  if (metadata.filePath) {
    lines.push(`File: ${metadata.filePath}`);
  }

  if (metadata.exports?.length > 0) {
    lines.push(`Exports: ${metadata.exports.join(', ')}`);
  }

  if (metadata.dependents?.length > 0) {
    lines.push(`Dependents: ${metadata.dependents.length}`);
  }

  return lines.join('\n');
}
