/**
 * @fileoverview layer-a-metadata.js
 * 
 * Definición del schema LayerAMetadata
 * 
 * @module metadata-contract/schemas/layer-a-metadata
 */

/**
 * @typedef {Object} LayerAMetadata
 * @property {string} filePath - Ruta del archivo (relativa al proyecto)
 * @property {number} exportCount - Cantidad de exports
 * @property {number} dependentCount - Cantidad de archivos que dependen de este
 * @property {number} importCount - Cantidad de imports
 * @property {number} functionCount - Cantidad de funciones
 * @property {string[]} exports - Nombres de los exports
 * @property {string[]} dependents - Rutas de archivos dependientes
 * 
 * // Flags de características
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
 * Crea un objeto LayerAMetadata vacío con valores por defecto
 * @param {string} filePath - Ruta del archivo
 * @returns {LayerAMetadata}
 */
export function createEmptyMetadata(filePath) {
  return {
    filePath,
    exportCount: 0,
    dependentCount: 0,
    importCount: 0,
    functionCount: 0,
    exports: [],
    dependents: [],
    hasDynamicImports: false,
    hasTypeScript: false,
    hasCSSInJS: false,
    hasLocalStorage: false,
    hasEventListeners: false,
    hasEventEmitters: false,
    hasGlobalAccess: false,
    hasAsyncPatterns: false,
    hasJSDoc: false,
    hasSingletonPattern: false,
    localStorageKeys: [],
    eventNames: [],
    envVars: [],
    semanticDependentCount: 0,
    definesGlobalState: false,
    usesGlobalState: false,
    globalStateWrites: [],
    globalStateReads: [],
    semanticConnections: []
  };
}

/**
 * Verifica si un objeto parece ser un LayerAMetadata válido
 * @param {*} obj - Objeto a verificar
 * @returns {boolean}
 */
export function isLayerAMetadata(obj) {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.filePath === 'string' &&
    typeof obj.exportCount === 'number';
}
