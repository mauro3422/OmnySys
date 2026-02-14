/**
 * @fileoverview Placeholder Replacer
 * 
 * Reemplaza placeholders {variable} en templates con valores de metadata.
 * Maneja escape de caracteres especiales en regex.
 * 
 * @module prompt-engine/utils/placeholder-replacer
 * @version 1.0.0
 */

import { resolvePlaceholder } from '../config/placeholder-registry.js';

/**
 * Escapa caracteres especiales para uso en RegExp
 * @param {string} string - String a escapar
 * @returns {string} - String escapado
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrae todos los placeholders de un template
 * @param {string} templateText - Texto del template
 * @returns {Array<string>} - Lista de placeholders únicos
 */
export function extractPlaceholders(templateText) {
  const matches = templateText.match(/\{[a-zA-Z0-9_]+\}/g) || [];
  return [...new Set(matches)];
}

/**
 * Reemplaza un placeholder específico en el texto
 * @param {string} text - Texto original
 * @param {string} placeholder - Placeholder a reemplazar {name}
 * @param {string} value - Valor de reemplazo
 * @returns {string} - Texto con reemplazo
 */
export function replacePlaceholder(text, placeholder, value) {
  const escaped = escapeRegExp(placeholder);
  const pattern = new RegExp(escaped, 'g');
  return text.replace(pattern, value);
}

/**
 * Reemplaza múltiples placeholders en un template
 * @param {string} template - Template con placeholders
 * @param {Object} metadata - Metadatos para resolver valores
 * @returns {string} - Template con valores reemplazados
 */
export function replaceAllPlaceholders(template, metadata) {
  const placeholders = extractPlaceholders(template);
  let result = template;
  
  for (const placeholder of placeholders) {
    const value = resolvePlaceholder(placeholder, metadata);
    result = replacePlaceholder(result, placeholder, value);
  }
  
  return result;
}

/**
 * Crea un mapa de reemplazos filtrado por placeholders presentes
 * @param {string} template - Template con placeholders
 * @param {Object} metadata - Metadatos
 * @returns {Map<string, string>} - Mapa de placeholder -> valor
 */
export function createReplacementMap(template, metadata) {
  const placeholders = extractPlaceholders(template);
  const map = new Map();
  
  for (const placeholder of placeholders) {
    map.set(placeholder, resolvePlaceholder(placeholder, metadata));
  }
  
  return map;
}

/**
 * Aplica reemplazos de un mapa al template
 * @param {string} template - Template original
 * @param {Map<string, string>} replacementMap - Mapa de reemplazos
 * @returns {string} - Template procesado
 */
export function applyReplacements(template, replacementMap) {
  let result = template;
  
  for (const [placeholder, value] of replacementMap) {
    result = replacePlaceholder(result, placeholder, value);
  }
  
  return result;
}
