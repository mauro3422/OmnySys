/**
 * @fileoverview Metadata Formatter
 * 
 * Formatea y compacta bloques de metadata para reducir tokens.
 * Elimina líneas vacías y valores por defecto innecesarios.
 * 
 * @module prompt-engine/utils/metadata-formatter
 * @version 1.0.0
 */

// Patrones de valores vacíos a eliminar
const EMPTY_PATTERNS = [
  /^\s*[^:]+:\s*$/,           // "KEY: "
  /^\s*[^:]+:\s*\[\]\s*$/,    // "KEY: []"
  /^\s*[^:]+:\s*\{\}\s*$/,   // "KEY: {}"
  /^\s*[^:]+:\s*false\s*$/,  // "KEY: false"
  /^\s*[^:]+:\s*0\s*\(\s*\)\s*$/  // "EXPORTS: 0 ()"
];

/**
 * Verifica si una línea está vacía o tiene valor por defecto
 * @param {string} line - Línea a verificar
 * @returns {boolean} - True si debe eliminarse
 */
function isEmptyLine(line) {
  // Remover paréntesis vacíos al final
  const normalized = line.replace(/\s*\(\s*\)\s*$/, '').trim();
  
  return EMPTY_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Compacta un bloque de texto removiendo líneas vacías
 * @param {string} text - Texto a compactar
 * @returns {string} - Texto compactado
 */
export function compactBlock(text) {
  const lines = text.split(/\r?\n/);
  const compacted = [];
  
  for (const line of lines) {
    if (!isEmptyLine(line)) {
      // Limpiar paréntesis vacíos
      const cleaned = line.replace(/\s*\(\s*\)\s*$/, '');
      compacted.push(cleaned);
    }
  }
  
  return compacted.join('\n');
}

/**
 * Compacta solo la sección de metadata (antes del código)
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
 * Escapa caracteres especiales para regex
 * @private
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Formatea metadata para visualización
 * @param {Object} metadata - Metadatos
 * @returns {string} - Representación formateada
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
