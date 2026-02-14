/**
 * @fileoverview Placeholder Registry
 * 
 * Registro central de placeholders disponibles para templates de prompts.
 * Facilita la extensibilidad y documentación de variables disponibles.
 * 
 * @module prompt-engine/config/placeholder-registry
 * @version 1.0.0
 */

/**
 * Formateadores de valor por tipo
 */
const FORMATTERS = {
  list: (value) => {
    if (!Array.isArray(value) || value.length === 0) return '';
    return value.join(', ');
  },
  
  json: (value, maxLength = 200) => {
    if (!Array.isArray(value) || value.length === 0) return '';
    return JSON.stringify(value).slice(0, maxLength);
  },
  
  boolean: (value) => value === true,
  
  number: (value) => value || 0,
  
  string: (value) => value || ''
};

/**
 * Definición de placeholders disponibles
 * Cada entrada define el tipo y cómo formatear el valor
 */
export const PLACEHOLDER_DEFINITIONS = {
  // Básicos del archivo
  '{filePath}': { type: 'string', extractor: (m) => m.filePath || 'unknown' },
  '{fileContent}': { type: 'string', extractor: () => '__OMNY_FILE_CONTENT__' },
  
  // Conteos
  '{exportCount}': { type: 'number', extractor: (m) => m.exportCount },
  '{dependentCount}': { type: 'number', extractor: (m) => m.dependentCount },
  '{importCount}': { type: 'number', extractor: (m) => m.importCount },
  '{functionCount}': { type: 'number', extractor: (m) => m.functionCount },
  '{semanticDependentCount}': { type: 'number', extractor: (m) => m.semanticDependentCount },
  
  // Listas
  '{exports}': { type: 'list', extractor: (m) => m.exports },
  '{dependents}': { type: 'list', extractor: (m) => m.dependents },
  '{localStorageKeys}': { type: 'list', extractor: (m) => m.localStorageKeys },
  '{eventNames}': { type: 'list', extractor: (m) => m.eventNames },
  '{envVars}': { type: 'list', extractor: (m) => m.envVars },
  '{globalStateWrites}': { type: 'list', extractor: (m) => m.globalStateWrites },
  '{globalStateReads}': { type: 'list', extractor: (m) => m.globalStateReads },
  
  // Booleanos
  '{hasDynamicImports}': { type: 'boolean', extractor: (m) => m.hasDynamicImports },
  '{hasTypeScript}': { type: 'boolean', extractor: (m) => m.hasTypeScript },
  '{hasCSSInJS}': { type: 'boolean', extractor: (m) => m.hasCSSInJS },
  '{hasLocalStorage}': { type: 'boolean', extractor: (m) => m.hasLocalStorage },
  '{hasEventListeners}': { type: 'boolean', extractor: (m) => m.hasEventListeners },
  '{hasGlobalAccess}': { type: 'boolean', extractor: (m) => m.hasGlobalAccess },
  '{hasAsyncPatterns}': { type: 'boolean', extractor: (m) => m.hasAsyncPatterns },
  '{hasJSDoc}': { type: 'boolean', extractor: (m) => m.hasJSDoc },
  '{hasSingletonPattern}': { type: 'boolean', extractor: (m) => m.hasSingletonPattern },
  '{hasEventEmitters}': { type: 'boolean', extractor: (m) => m.hasEventEmitters },
  '{definesGlobalState}': { type: 'boolean', extractor: (m) => m.definesGlobalState },
  '{usesGlobalState}': { type: 'boolean', extractor: (m) => m.usesGlobalState },
  
  // JSON complejos
  '{semanticConnections}': { type: 'json', extractor: (m) => m.semanticConnections }
};

/**
 * Obtiene todos los placeholders registrados
 * @returns {Object} - Definiciones de placeholders
 */
export function getAllPlaceholders() {
  return { ...PLACEHOLDER_DEFINITIONS };
}

/**
 * Obtiene los placeholders requeridos por un template
 * @param {string} templateText - Texto del template
 * @returns {Array<string>} - Lista de placeholders encontrados
 */
export function extractRequiredPlaceholders(templateText) {
  const matches = templateText.match(/\{[a-zA-Z0-9_]+\}/g) || [];
  return [...new Set(matches)];
}

/**
 * Resuelve el valor de un placeholder desde metadata
 * @param {string} placeholder - Nombre del placeholder {name}
 * @param {Object} metadata - Metadatos del archivo
 * @returns {string} - Valor formateado
 */
export function resolvePlaceholder(placeholder, metadata) {
  const definition = PLACEHOLDER_DEFINITIONS[placeholder];
  
  if (!definition) {
    return '';
  }
  
  const rawValue = definition.extractor(metadata);
  const formatter = FORMATTERS[definition.type];
  
  return formatter(rawValue);
}

/**
 * Verifica si un placeholder está registrado
 * @param {string} placeholder - Nombre del placeholder
 * @returns {boolean} - True si existe
 */
export function isValidPlaceholder(placeholder) {
  return placeholder in PLACEHOLDER_DEFINITIONS;
}

/**
 * Lista todos los nombres de placeholders disponibles
 * @returns {Array<string>} - Lista de nombres
 */
export function listAvailablePlaceholders() {
  return Object.keys(PLACEHOLDER_DEFINITIONS);
}
