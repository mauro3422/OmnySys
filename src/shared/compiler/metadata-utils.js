/**
 * @fileoverview metadata-utils.js
 *
 * Utilidades compartidas para operaciones de metadata y caching.
 * Centraliza patrones comunes de acceso a metadata para evitar duplicación conceptual.
 *
 * @module shared/compiler/metadata-utils
 */

/**
 * Obtiene metadata de un objeto con fallback a cache
 * Patrón unificado para evitar duplicación de getGuardMetadata, getCachedMetadata, etc.
 *
 * @param {Object} source - Objeto fuente (server, registry, etc.)
 * @param {Object} [cache] - Cache opcional con método get
 * @param {string} [key='metadata'] - Key para buscar en cache
 * @returns {Object|null} Metadata encontrada o null
 */
export function getCachedMetadata(source, cache = null, key = 'metadata') {
    if (source?.[key]) {
        return source[key];
    }

    if (cache?.get) {
        const cached = cache.get(key);
        if (cached) return cached;
    }

    return null;
}

/**
 * Obtiene counts de un objeto con fallbacks encadenados
 * @param {Object} cache - Cache con index.metadata
 * @param {Object} [fallback] - Objeto fallback con stats
 * @returns {Object} Counts { totalFiles, totalAtoms }
 */
export function getCachedCounts(cache, fallback = {}) {
    return {
        totalFiles: cache?.index?.metadata?.totalFiles
            || fallback?.stats?.totalFiles
            || fallback?.totalFiles
            || 0,
        totalAtoms: cache?.index?.metadata?.totalAtoms
            || fallback?.stats?.totalAtoms
            || fallback?.totalFunctions
            || fallback?.totalAtoms
            || 0
    };
}

/**
 * Obtiene fecha de último análisis de metadata anidada
 * @param {Object} metadata - Objeto metadata con múltiples fuentes
 * @returns {string|null} Fecha ISO o null
 */
export function getLastAnalyzed(metadata = {}) {
    return metadata?.system_map_metadata?.analyzedAt
        || metadata?.core_metadata?.enhancedAt
        || metadata?.indexedAt
        || null;
}

/**
 * Obtiene status de fase 2 de un orquestador
 * @param {Object} orchestrator - Orquestador con phase2Status
 * @returns {Object|null} Status de fase 2 o null
 */
export function getPhase2Status(orchestrator) {
    return orchestrator?.phase2Status || null;
}

/**
 * Construye objeto de metadata básica para guards
 * @param {string} domain - Dominio del guard
 * @param {string} version - Versión semántica
 * @param {string} description - Descripción
 * @returns {Object} Metadata estandarizada
 */
export function buildGuardMetadata(domain, version, description) {
    return {
        domain,
        version,
        description,
        registeredAt: new Date().toISOString()
    };
}

/**
 * Extrae metadata de guard de un Map
 * Alias semántico para getGuardMetadata cuando se usa con Maps
 *
 * @param {Map} metadataMap - Map de metadata
 * @param {string} name - Nombre del guard
 * @returns {Object|null} Metadata o null
 */
export function getMetadataFromMap(metadataMap, name) {
    return metadataMap?.get(name) || null;
}

/**
 * Lista todos los items de un Map con formato estandarizado
 * @param {Map} metadataMap - Map de metadata
 * @returns {Array<Object>} Lista de items con metadata
 */
export function listMetadataItems(metadataMap) {
    const items = [];

    for (const [name, meta] of metadataMap.entries()) {
        items.push({
            name,
            type: meta.type,
            domain: meta.domain,
            version: meta.version,
            description: meta.description,
            registeredAt: meta.registeredAt
        });
    }

    return items;
}
