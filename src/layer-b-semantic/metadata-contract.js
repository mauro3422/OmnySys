/**
 * Metadata Contract - Contrato formal entre Layer A y Layer B
 * 
 * Este archivo define la interfaz estándar de metadatos que Layer A debe proveer
 * a Layer B para el sistema de análisis semántico.
 * 
 * BENEFICIOS:
 * - Elimina acoplamiento implícito entre capas
 * - Documenta explícitamente qué datos fluyen entre capas
 * - Permite validación de metadatos en runtime
 * - Facilita agregar nuevos tipos de análisis
 * 
 * USO:
 * Layer A debe construir un objeto que cumpla con LayerAMetadata
 * Layer B usa estos metadatos para seleccionar prompts y analizar
 */

/**
 * @typedef {Object} LayerAMetadata
 * @property {string} filePath - Ruta del archivo (relativa al proyecto)
 * @property {number} exportCount - Cantidad de exports
 * @property {number} dependentCount - Cantidad de archivos que dependen de este (usedBy.length)
 * @property {number} importCount - Cantidad de imports
 * @property {number} functionCount - Cantidad de funciones
 * @property {string[]} exports - Nombres de los exports (limitado a 10)
 * @property {string[]} dependents - Rutas de archivos dependientes (limitado a 10)
 * 
 * // Flags de características detectadas
 * @property {boolean} hasDynamicImports - Tiene import() dinámicos
 * @property {boolean} hasTypeScript - Es archivo TypeScript
 * @property {boolean} hasCSSInJS - Usa styled-components/emotion
 * @property {boolean} hasLocalStorage - Accede a localStorage
 * @property {boolean} hasEventListeners - Tiene event listeners
 * @property {boolean} hasEventEmitters - Tiene event emitters
 * @property {boolean} hasGlobalAccess - Accede a variables globales
 * @property {boolean} hasAsyncPatterns - Tiene async/await o Promises
 * @property {boolean} hasJSDoc - Tiene documentación JSDoc
 * @property {boolean} hasSingletonPattern - Tiene patrón Singleton
 * 
 * // Datos específicos
 * @property {string[]} localStorageKeys - Claves de localStorage usadas
 * @property {string[]} eventNames - Nombres de eventos usados
 * @property {string[]} envVars - Variables de entorno usadas
 * @property {number} semanticDependentCount - Conexiones semánticas detectadas
 * @property {boolean} definesGlobalState - Escribe estado global
 * @property {boolean} usesGlobalState - Lee estado global
 * @property {string[]} globalStateWrites - Props globales escritas
 * @property {string[]} globalStateReads - Props globales leídas
 * @property {Array} semanticConnections - Conexiones semánticas resumidas
 * 
 * // Metadatos adicionales (opcional)
 * @property {Object} jsdocContracts - Contratos JSDoc extraídos
 * @property {Object} runtimeContracts - Aserciones de runtime
 * @property {Object} asyncPatterns - Patrones async detectados
 * @property {Object} errorHandling - Manejo de errores
 * @property {Object} buildTimeDeps - Dependencias de build-time
 * @property {Object} cssInJS - Información CSS-in-JS
 * @property {Object} typescript - Información TypeScript
 * @property {Object} coupling - Métricas de acoplamiento
 */

/**
 * Campos requeridos mínimos para el sistema de prompts
 * Estos campos DEBEN estar presentes para que los detectores funcionen
 */
export const REQUIRED_METADATA_FIELDS = [
  'filePath',
  'exportCount',
  'dependentCount',
  'importCount',
  'functionCount'
];

/**
 * Campos opcionales que pueden usarse para detección avanzada
 */
export const OPTIONAL_METADATA_FIELDS = [
  'exports',
  'dependents',
  'hasDynamicImports',
  'hasTypeScript',
  'hasCSSInJS',
  'hasLocalStorage',
  'hasEventListeners',
  'hasEventEmitters',
  'hasGlobalAccess',
  'hasAsyncPatterns',
  'hasJSDoc',
  'hasSingletonPattern',
  'localStorageKeys',
  'eventNames',
  'envVars',
  'semanticDependentCount',
  'definesGlobalState',
  'usesGlobalState',
  'globalStateWrites',
  'globalStateReads',
  'semanticConnections'
];

/**
 * Valida que los metadatos cumplan con el contrato
 * @param {Object} metadata - Metadatos a validar
 * @returns {Object} - { valid: boolean, missing: string[], errors: string[] }
 */
export function validateMetadata(metadata) {
  const missing = [];
  const errors = [];

  // Verificar campos requeridos
  for (const field of REQUIRED_METADATA_FIELDS) {
    if (metadata[field] === undefined || metadata[field] === null) {
      missing.push(field);
    }
  }

  // Validar tipos de datos
  if (metadata.exportCount !== undefined && typeof metadata.exportCount !== 'number') {
    errors.push(`exportCount must be a number, got ${typeof metadata.exportCount}`);
  }
  if (metadata.dependentCount !== undefined && typeof metadata.dependentCount !== 'number') {
    errors.push(`dependentCount must be a number, got ${typeof metadata.dependentCount}`);
  }
  if (metadata.importCount !== undefined && typeof metadata.importCount !== 'number') {
    errors.push(`importCount must be a number, got ${typeof metadata.importCount}`);
  }
  if (metadata.functionCount !== undefined && typeof metadata.functionCount !== 'number') {
    errors.push(`functionCount must be a number, got ${typeof metadata.functionCount}`);
  }

  // Validar arrays
  if (metadata.exports !== undefined && !Array.isArray(metadata.exports)) {
    errors.push(`exports must be an array, got ${typeof metadata.exports}`);
  }
  if (metadata.dependents !== undefined && !Array.isArray(metadata.dependents)) {
    errors.push(`dependents must be an array, got ${typeof metadata.dependents}`);
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors
  };
}

/**
 * Constantes para detección de patrones arquitectónicos
 */
export const ARCHITECTURAL_THRESHOLDS = {
  GOD_OBJECT: {
    MIN_EXPORTS: 5,
    MIN_DEPENDENTS: 5,
    HIGH_DEPENDENTS: 10
  },
  ORPHAN_MODULE: {
    MAX_DEPENDENTS: 0,
    MIN_EXPORTS: 1
  }
};

/**
 * Detecta si un archivo es un God Object basado en métricas de acoplamiento
 * 
 * @param {number} exportCount - Cantidad de exports
 * @param {number} dependentCount - Cantidad de archivos dependientes
 * @returns {boolean} - true si es God Object
 */
export function detectGodObject(exportCount, dependentCount) {
  const { MIN_EXPORTS, MIN_DEPENDENTS, HIGH_DEPENDENTS } = ARCHITECTURAL_THRESHOLDS.GOD_OBJECT;
  return ((exportCount || 0) >= MIN_EXPORTS && (dependentCount || 0) >= MIN_DEPENDENTS) ||
         ((dependentCount || 0) >= HIGH_DEPENDENTS);
}

/**
 * Detecta si un archivo es un Orphan Module
 * 
 * @param {number} exportCount - Cantidad de exports
 * @param {number} dependentCount - Cantidad de archivos dependientes
 * @returns {boolean} - true si es Orphan Module
 */
export function detectOrphanModule(exportCount, dependentCount) {
  const { MAX_DEPENDENTS, MIN_EXPORTS } = ARCHITECTURAL_THRESHOLDS.ORPHAN_MODULE;
  return (dependentCount || 0) <= MAX_DEPENDENTS && (exportCount || 0) >= MIN_EXPORTS;
}

/**
 * Construye metadatos estándar a partir de datos de Layer A
 * Esta función centraliza la extracción de metadatos para evitar duplicación
 * 
 * @param {Object} fileAnalysis - Análisis del archivo desde Layer A
 * @param {string} filePath - Ruta del archivo
 * @param {Object} semanticAnalysis - Análisis semántico estático
 * @returns {LayerAMetadata} - Metadatos estandarizados
 */
export function buildStandardMetadata(fileAnalysis, filePath, semanticAnalysis = {}) {
  const exports = (fileAnalysis.exports || []).map(e => 
    typeof e === 'string' ? e : e.name
  ).filter(Boolean);

  const usedBy = fileAnalysis.usedBy || [];
  const imports = fileAnalysis.imports || [];
  const functions = fileAnalysis.functions || [];

  // Extraer localStorage keys del análisis semántico
  const localStorageKeys = (semanticAnalysis.sharedState?.writes || [])
    .filter(w => typeof w === 'string')
    .slice(0, 5);

  // Extraer event names
  const eventEmitters = semanticAnalysis.eventPatterns?.eventEmitters || [];
  const eventListeners = semanticAnalysis.eventPatterns?.eventListeners || [];
  const eventNames = [...eventEmitters, ...eventListeners]
    .map(e => typeof e === 'string' ? e : e.eventName)
    .filter(Boolean)
    .slice(0, 5);

  return {
    // Campos base
    filePath,
    exportCount: exports.length,
    dependentCount: usedBy.length,
    importCount: imports.length,
    functionCount: functions.length,
    
    // Arrays limitados
    exports: exports.slice(0, 10),
    dependents: usedBy.slice(0, 10),
    
    // Flags de características
    hasDynamicImports: semanticAnalysis.sideEffects?.usesDynamicImport || false,
    hasTypeScript: filePath.endsWith('.ts') || filePath.endsWith('.tsx'),
    hasCSSInJS: false, // Se detecta en metadata-extractors
    hasLocalStorage: localStorageKeys.length > 0,
    hasEventListeners: eventNames.length > 0,
    hasGlobalAccess: semanticAnalysis.sideEffects?.hasGlobalAccess || false,
    hasAsyncPatterns: false, // Se detecta en metadata-extractors
    hasJSDoc: false, // Se detecta en metadata-extractors
    
    // Datos específicos
    localStorageKeys,
    eventNames,
    envVars: [], // Se detecta en metadata-extractors
    
    // Flags adicionales (se completan en el enriquecedor)
    hasAsyncPatterns: false,
    hasJSDoc: false,
    hasRuntimeContracts: false,
    hasErrorHandling: false,
    hasBuildTimeDeps: false,
    hasSingletonPattern: false
  };
}

/**
 * Construye metadata para prompts/arquetipos a partir del análisis completo
 * @param {string} filePath - Ruta relativa del archivo
 * @param {object} fileAnalysis - Análisis del archivo (Layer A)
 * @returns {LayerAMetadata}
 */
export function buildPromptMetadata(filePath, fileAnalysis = {}) {
  const analysis = fileAnalysis || {};
  const semantic = analysis.semanticAnalysis || {};
  const sharedState = semantic.sharedState || {};
  const eventPatterns = semantic.eventPatterns || {};
  const sideEffects = semantic.sideEffects || {};
  const extra = analysis.metadata || {};

  const exports = (analysis.exports || []).map(e =>
    typeof e === 'string' ? e : e?.name
  ).filter(Boolean);

  const dependents = Array.isArray(analysis.usedBy)
    ? analysis.usedBy
    : (analysis.dependents || []);

  const imports = analysis.imports || [];
  const functions = analysis.functions || [];

  const eventEmitters = eventPatterns.eventEmitters || [];
  const eventListeners = eventPatterns.eventListeners || [];
  const eventNames = [...new Set([
    ...eventEmitters.map(e => e?.eventName || e?.event || e?.name || String(e)),
    ...eventListeners.map(e => e?.eventName || e?.event || e?.name || String(e))
  ])].filter(Boolean).slice(0, 10);

  const globalStateWrites = (sharedState.writeProperties || sharedState.writes || []).slice(0, 10);
  const globalStateReads = (sharedState.readProperties || sharedState.reads || []).slice(0, 10);

  const envVars = (extra.buildTimeDeps?.envVars || [])
    .map(v => v?.name || v?.key || v?.varName)
    .filter(Boolean)
    .slice(0, 10);

  const hasJSDoc = (extra.jsdocContracts?.all?.length || 0) > 0;
  const hasAsyncPatterns = (extra.asyncPatterns?.all?.length || 0) > 0;
  const hasCSSInJS = (
    (extra.cssInJS?.all?.length || 0) > 0 ||
    (extra.cssInJS?.components?.length || 0) > 0 ||
    (extra.cssInJS?.themes?.length || 0) > 0 ||
    (extra.cssInJS?.globalStyles?.length || 0) > 0
  );
  const hasTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx') ||
    (extra.typescript?.all?.length || 0) > 0;

  const hasDynamicImports = (imports || []).some(imp =>
    imp?.type === 'dynamic' ||
    (typeof imp?.source === 'string' && (imp.source.includes('${') || imp.source.includes('+')))
  );

  const exportNamesLower = exports.map(e => String(e).toLowerCase());
  const hasSingletonPattern =
    extra.hasSingletonPattern === true ||
    exportNamesLower.some(name =>
      name.includes('singleton') || name.includes('getinstance') || name === 'instance'
    );

  const semanticConnections = analysis.semanticConnections || [];
  const localStorageKeys = semanticConnections
    .filter(c => c?.type === 'localStorage' || c?.via === 'localStorage')
    .map(c => c?.key || c?.localStorageKey)
    .filter(Boolean)
    .slice(0, 5);

  return {
    filePath: analysis.filePath || filePath,
    exportCount: exports.length,
    dependentCount: dependents.length,
    importCount: imports.length,
    functionCount: functions.length,

    exports: exports.slice(0, 10),
    dependents: dependents.slice(0, 10),

    hasDynamicImports,
    hasTypeScript,
    hasCSSInJS,
    hasLocalStorage: sideEffects.usesLocalStorage || localStorageKeys.length > 0,
    hasEventListeners: (eventListeners.length > 0) || sideEffects.hasEventListeners,
    hasGlobalAccess: sideEffects.hasGlobalAccess || globalStateReads.length > 0 || globalStateWrites.length > 0,
    hasAsyncPatterns,
    hasJSDoc,
    hasSingletonPattern,

    localStorageKeys,
    eventNames,
    envVars,

    semanticDependentCount: semanticConnections.length,
    definesGlobalState: globalStateWrites.length > 0,
    usesGlobalState: globalStateReads.length > 0,
    globalStateWrites,
    globalStateReads,
    hasEventEmitters: eventEmitters.length > 0,
    semanticConnections: semanticConnections.map(c => ({
      target: c.target || c.targetFile,
      type: c.type || c.via,
      key: c.key || c.event || c.eventName
    })).slice(0, 5)
  };
}

export default {
  REQUIRED_METADATA_FIELDS,
  OPTIONAL_METADATA_FIELDS,
  validateMetadata,
  buildStandardMetadata,
  buildPromptMetadata,
  detectGodObject,
  detectOrphanModule,
  ARCHITECTURAL_THRESHOLDS
};
