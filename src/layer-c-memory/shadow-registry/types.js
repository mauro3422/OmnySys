/**
 * @fileoverview Shadow Registry Types - Tipos y constantes
 * 
 * @module layer-c-memory/shadow-registry/types
 */

/**
 * Estados de una sombra
 * @readonly
 * @enum {string}
 */
export const ShadowStatus = {
  /** Eliminado pero no reemplazado */
  DELETED: 'deleted',
  /** Reemplazado por otro átomo */
  REPLACED: 'replaced',
  /** Fusionado con otro átomo */
  MERGED: 'merged',
  /** Dividido en múltiples átomos */
  SPLIT: 'split'
};

/**
 * Tipos de evolución
 * @readonly
 * @enum {string}
 */
export const EvolutionType = {
  /** Refactor simple, misma responsabilidad */
  REFACTOR: 'refactor',
  /** Cambio de dominio (ej: cart → order) */
  DOMAIN_CHANGE: 'domain_change',
  /** Agregó responsabilidades */
  EXPANDED: 'expanded',
  /** Redujo responsabilidades */
  SHRINKED: 'shrinked',
  /** Renombrado sin cambios */
  RENAMED: 'renamed',
  /** Reimplementación total */
  REIMPLEMENTED: 'reimplemented'
};

/**
 * Estructura de una Sombra (guardada en storage)
 * @typedef {Object} Shadow
 * @property {string} shadowId - ID único de la sombra (ej: "shadow_a1b2c3")
 * @property {string} originalId - ID original del átomo (ej: "src/api.js::processCart")
 * @property {ShadowStatus} status - Estado actual
 * @property {string} [replacedBy] - ID del átomo que lo reemplazó
 * @property {string} [replacedByShadowId] - ID de sombra del reemplazo
 * @property {string} bornAt - ISO timestamp de creación
 * @property {string} diedAt - ISO timestamp de eliminación
 * @property {number} lifespan - Días de vida
 * 
 * @property {Object} dna - ADN del átomo (fingerprint estructural)
 * @property {string} dna.id - ID del ADN
 * @property {string} dna.structuralHash - Hash de estructura
 * @property {string} dna.patternHash - Hash de patrón
 * @property {string} dna.flowType - Tipo de flujo
 * @property {string[]} dna.operationSequence - Secuencia de operaciones
 * @property {number} dna.complexityScore - Complejidad 1-10
 * @property {string} dna.semanticFingerprint - Huella semántica
 * 
 * @property {Object} metadata - Metadatos validados
 * @property {string} metadata.name - Nombre de la función
 * @property {Object} metadata.dataFlow - Resumen de data flow
 * @property {Object} [metadata.semantic] - Análisis semántico
 * @property {string} metadata.filePath - Archivo origen
 * @property {number} metadata.lineNumber - Línea en archivo
 * @property {boolean} metadata.isExported - Si era exportado
 * 
 * @property {Object} lineage - Información de linaje
 * @property {string} [lineage.parentShadowId] - Sombra padre (si evolucionó de otra)
 * @property {string[]} lineage.childShadowIds - Sombras hijas
 * @property {EvolutionType} [lineage.evolutionType] - Tipo de evolución
 * @property {number} lineage.generation - Generación (0 = génesis)
 * 
 * @property {Object} inheritance - Datos heredables
 * @property {Object[]} inheritance.connections - Conexiones fuertes
 * @property {number} inheritance.connectionCount - Total de conexiones
 * @property {number} inheritance.vibrationScore - Score de vibración
 * @property {string[]} inheritance.rupturedConnections - Conexiones rotas
 * 
 * @property {Object} death - Información de muerte
 * @property {string} death.reason - Razón del borrado
 * @property {string[]} death.commitsInvolved - Commits relacionados
 * @property {number} death.riskIntroduced - Riesgo introducido 0-1
 * @property {string} [death.replacementId] - ID del reemplazo
 */

/**
 * Estructura de Ancestry (agregada a átomos vivos)
 * @typedef {Object} Ancestry
 * @property {string} replaced - shadowId del antepasado directo
 * @property {string[]} lineage - Array de shadowIds (ancestros)
 * @property {number} generation - Número de generación
 * @property {number} vibrationScore - Score de vibración heredada
 * @property {Object[]} strongConnections - Conexiones heredadas
 * @property {string[]} warnings - Advertencias del linaje
 */

/**
 * Estructura de Lineage Link (relación en DB)
 * @typedef {Object} LineageLink
 * @property {string} ancestorId - shadowId del ancestro
 * @property {string} descendantId - ID del descendiente (átomo o sombra)
 * @property {EvolutionType} type - Tipo de evolución
 * @property {number} similarity - Similitud 0-1
 * @property {string} createdAt - ISO timestamp
 */

/**
 * Opciones para búsqueda de sombras
 * @typedef {Object} ShadowSearchOptions
 * @property {string} [patternHash] - Filtrar por hash de patrón
 * @property {string} [flowType] - Filtrar por tipo de flujo
 * @property {number} [minSimilarity] - Similitud mínima (0-1)
 * @property {number} [limit] - Máximo resultados
 * @property {boolean} [includeReplaced] - Incluir ya reemplazadas
 */
