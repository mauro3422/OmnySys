/**
 * @fileoverview guard-standards.js
 *
 * Sistema de estandarización para guards del FileWatcher.
 * Define formatos consistentes de issue types, severidad, metadata y utilidades compartidas.
 *
 * @module core/file-watcher/guards/guard-standards
 * @version 2.0.0
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:guards:standards');

/**
 * ============================================================================
 * ESTÁNDAR DE NOMENCLATURA DE ISSUES
 * ============================================================================
 * 
 * Formato: {domain}_{subdomain}_{severity}
 * 
 * Dominios (domain):
 * - code: Calidad de código (duplicados, complejidad, estilo)
 * - arch: Arquitectura (impacto, dependencias, circularidad)
 * - sem: Semántica (data-flow, estado compartido, pureza)
 * - runtime: Runtime (async safety, memory leaks, errores)
 * - perf: Performance (hotspots, cuellos de botella)
 * 
 * Subdominios comunes:
 * - duplicate: Código duplicado
 * - impact: Ola de impacto
 * - circular: Dependencias circulares
 * - shared_state: Estado compartido
 * - data_flow: Flujo de datos
 * - async_safety: Seguridad asíncrona
 * - event_leak: Fugas de event listeners
 * - hotspot: Puntos calientes de cambio
 * - complexity: Complejidad ciclomática
 * - dead_code: Código muerto
 */

export const IssueDomains = {
    CODE: 'code',
    ARCH: 'arch',
    SEM: 'sem',
    RUNTIME: 'runtime',
    PERF: 'perf'
};

export const IssueSeverity = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info'
};

/**
 * Genera un issue type estandarizado
 * @param {string} domain - Dominio (use IssueDomains)
 * @param {string} subdomain - Subdominio específico
 * @param {string} severity - Severidad (use IssueSeverity)
 * @returns {string} issue type estandarizado
 */
export function createIssueType(domain, subdomain, severity) {
    return `${domain}_${subdomain}_${severity}`;
}

/**
 * ============================================================================
 * THRESHOLDS ESTÁNDAR
 * ============================================================================
 */

export const StandardThresholds = {
    // Complejidad
    COMPLEXITY_HIGH: 20,
    COMPLEXITY_MEDIUM: 15,
    COMPLEXITY_LOW: 10,
    
    // Tamaño
    LINES_HIGH: 150,
    LINES_MEDIUM: 100,
    
    // Impacto
    IMPACT_HIGH: 18,
    IMPACT_MEDIUM: 10,
    IMPACT_LOW: 4,
    
    // Estado compartido
    SHARED_STATE_HIGH: 10,   // Radioactive atom
    SHARED_STATE_MEDIUM: 5,  // High contention
    
    // Hotspot (frecuencia de cambio)
    HOTSPOT_HIGH: 5,         // >5 cambios en 30 días
    HOTSPOT_MEDIUM: 3,
    
    // Async safety
    ASYNC_MAX_LINES: 50,     // Funciones async largas sin error handling
    
    // Data flow
    COHERENCE_MIN: 0.3,      // Coherencia mínima aceptable
    
    // Event leaks
    LISTENERS_PER_EMITTER: 5 // Listeners sospechosos por emisor
};

/**
 * ============================================================================
 * ESTRUCTURA DE CONTEXTO ESTÁNDAR
 * ============================================================================
 */

/**
 * Crea un contexto estándar para issues del watcher
 * @param {Object} params - Parámetros del contexto
 * @returns {Object} Contexto estandarizado
 */
export function createStandardContext({
    guardName,
    atomId = null,
    atomName = null,
    metricValue = null,
    threshold = null,
    severity = null,
    suggestedAction,
    suggestedAlternatives = [],
    relatedAtomIds = [],
    relatedFiles = [],
    extraData = {}
} = {}) {
    const context = {
        // Identificación
        source: 'file_watcher',
        guardName,
        timestamp: new Date().toISOString(),
        
        // Átomo afectado (si aplica)
        ...(atomId && { atomId }),
        ...(atomName && { atomName }),
        
        // Métricas cuantitativas
        ...(metricValue !== null && { metricValue }),
        ...(threshold !== null && { threshold }),
        
        // Severidad calculada (si aplica)
        ...(severity && { severity }),
        
        // Acciones sugeridas
        suggestedAction,
        ...(suggestedAlternatives.length > 0 && { suggestedAlternatives }),
        
        // Relaciones
        ...(relatedAtomIds.length > 0 && { relatedAtomIds }),
        ...(relatedFiles.length > 0 && { relatedFiles }),
        
        // Datos extras específicos del guard
        ...extraData
    };
    
    return context;
}

/**
 * ============================================================================
 * UTILIDADES DE SEVERIDAD
 * ============================================================================
 */

/**
 * Calcula severidad basada en complejidad ciclomática
 * @param {number} complexity - Complejidad ciclomática
 * @returns {string} Severidad (high/medium/low)
 */
export function severityFromComplexity(complexity) {
    if (complexity >= StandardThresholds.COMPLEXITY_HIGH) return IssueSeverity.HIGH;
    if (complexity >= StandardThresholds.COMPLEXITY_MEDIUM) return IssueSeverity.MEDIUM;
    if (complexity >= StandardThresholds.COMPLEXITY_LOW) return IssueSeverity.LOW;
    return null;
}

/**
 * Calcula severidad basada en cantidad de líneas
 * @param {number} lines - Líneas de código
 * @returns {string} Severidad (high/medium/low)
 */
export function severityFromLines(lines) {
    if (lines >= StandardThresholds.LINES_HIGH) return IssueSeverity.HIGH;
    if (lines >= StandardThresholds.LINES_MEDIUM) return IssueSeverity.MEDIUM;
    return null;
}

/**
 * Calcula severidad basada en score de impacto
 * @param {number} score - Score de impacto
 * @returns {string} Severidad (high/medium/low/none)
 */
export function severityFromImpact(score) {
    if (score >= StandardThresholds.IMPACT_HIGH) return IssueSeverity.HIGH;
    if (score >= StandardThresholds.IMPACT_MEDIUM) return IssueSeverity.MEDIUM;
    if (score >= StandardThresholds.IMPACT_LOW) return IssueSeverity.LOW;
    return null;
}

/**
 * Calcula severidad basada en contención de estado compartido
 * @param {number} connectionCount - Número de conexiones
 * @returns {string} Severidad (high/medium/low)
 */
export function severityFromSharedState(connectionCount) {
    if (connectionCount >= StandardThresholds.SHARED_STATE_HIGH) return IssueSeverity.HIGH;
    if (connectionCount >= StandardThresholds.SHARED_STATE_MEDIUM) return IssueSeverity.MEDIUM;
    return null;
}

/**
 * ============================================================================
 * UTILIDADES DE METADATA DE ÁTOMOS
 * ============================================================================
 */

/**
 * Verifica si un átomo es candidato para análisis de guards
 * @param {Object} atom - Átomo del schema
 * @returns {boolean}
 */
export function isValidGuardTarget(atom) {
    if (!atom) return false;
    
    // Solo funciones, métodos, arrows, clases
    const validTypes = ['function', 'method', 'arrow', 'class'];
    if (!validTypes.includes(atom.type)) return false;
    
    // Ignorar código muerto o removido
    if (atom.isDeadCode || atom.isRemoved) return false;
    
    // Ignorar nombres de baja señal
    if (isLowSignalName(atom.name)) return false;
    
    return true;
}

/**
 * Verifica si un nombre es de baja señal (callbacks anónimos, etc.)
 * @param {string} name - Nombre del átomo
 * @returns {boolean}
 */
export function isLowSignalName(name) {
    if (!name) return true;
    
    const lowSignalPatterns = [
        /^anonymous(_\d+)?$/i,
        /^.*_callback$/i,
        /_arg\d+$/i,
        /^(then|catch|map|filter|some|reduce)_callback$/i
    ];
    
    return lowSignalPatterns.some(pattern => pattern.test(name));
}

/**
 * Extrae métricas relevantes de un átomo para análisis
 * @param {Object} atom - Átomo del schema
 * @returns {Object} Métricas extraídas
 */
export function extractAtomMetrics(atom) {
    return {
        id: atom.id,
        name: atom.name,
        type: atom.type,
        complexity: atom.complexity || 1,
        linesOfCode: atom.linesOfCode || 0,
        isAsync: atom.isAsync || false,
        isExported: atom.isExported || false,
        hasErrorHandling: atom.hasErrorHandling || false,
        hasNetworkCalls: atom.hasNetworkCalls || false,
        sharedStateAccess: atom.sharedStateAccess || [],
        eventEmitters: atom.eventEmitters || [],
        eventListeners: atom.eventListeners || [],
        changeFrequency: atom.changeFrequency || 0,
        ageDays: atom.ageDays || 0,
        fragilityScore: atom.fragilityScore || 0,
        riskLevel: atom.riskLevel || 'LOW'
    };
}

/**
 * ============================================================================
 * GENERADORES DE MENSAJES
 * ============================================================================
 */

/**
 * Genera mensaje estándar para duplicados
 * @param {number} count - Cantidad de duplicados
 * @param {string} preview - Preview de símbolos
 * @returns {string} Mensaje formateado
 */
export function formatDuplicateMessage(count, preview) {
    return `${count} duplicate symbol${count > 1 ? 's' : ''} detected: ${preview}`;
}

/**
 * Genera mensaje estándar para impacto
 * @param {string} level - Nivel de impacto
 * @param {number} score - Score numérico
 * @param {number} relatedFiles - Archivos relacionados
 * @returns {string} Mensaje formateado
 */
export function formatImpactMessage(level, score, relatedFiles) {
    return `Impact wave ${level} (score=${score}, ${relatedFiles} related file${relatedFiles !== 1 ? 's' : ''})`;
}

/**
 * Genera mensaje estándar para async safety
 * @param {string} functionName - Nombre de la función
 * @param {string} reason - Razón del warning
 * @returns {string} Mensaje formateado
 */
export function formatAsyncSafetyMessage(functionName, reason) {
    return `Async function '${functionName}' ${reason}`;
}

/**
 * Genera mensaje estándar para event leaks
 * @param {string} functionName - Nombre de la función
 * @param {number} listenerCount - Cantidad de listeners
 * @returns {string} Mensaje formateado
 */
export function formatEventLeakMessage(functionName, listenerCount) {
    return `Potential event leak in '${functionName}' (${listenerCount} listeners without cleanup)`;
}

/**
 * ============================================================================
 * SUGERENCIAS DE ACCIÓN ESTÁNDAR
 * ============================================================================
 */

export const StandardSuggestions = {
    // Duplicados
    DUPLICATE_REUSE: 'Use atomic_edit to extend the existing function instead of duplicating',
    DUPLICATE_RENAME: 'Rename using one of the suggested alternatives to avoid collision',
    
    // Impacto
    IMPACT_REVIEW: 'Review all related files before committing this change',
    IMPACT_BREAKING: 'This change may break callers. Consider backward compatibility',
    
    // Async
    ASYNC_ADD_TRY_CATCH: 'Add try/catch block to handle network errors gracefully',
    ASYNC_ADD_ERROR_PARAM: 'Add error handling to the callback or use async/await with try/catch',
    
    // Event leaks
    EVENT_ADD_CLEANUP: 'Add cleanup logic in a return function or component unmount',
    EVENT_USE_ONCE: 'Consider using .once() instead of .on() for one-time listeners',
    
    // Complejidad
    COMPLEXITY_SPLIT: 'Split this function into smaller, focused functions',
    COMPLEXITY_REFACTOR: 'Refactor to reduce nesting and improve readability',
    
    // Shared state
    SHARED_STATE_LOCAL: 'Convert shared state to local state or parameters',
    SHARED_STATE_EXTRACT: 'Extract state management into a dedicated store/module',
    
    // Hotspots
    HOTSPOT_STABILIZE: 'This code changes frequently. Consider stabilizing the interface',
    HOTSPOT_DOCUMENT: 'Add comprehensive documentation due to high change frequency',
    
    // Dead code
    DEAD_CODE_REMOVE: 'Remove dead code or mark with @deprecated if needed for migration',
    DEAD_CODE_REVIVE: 'If temporarily disabled, add a TODO with revival conditions'
};

/**
 * ============================================================================
 * VALIDACIÓN DE GUARDS
 * ============================================================================
 */

/**
 * Valida que un guard implemente la interfaz correcta
 * @param {Object} guard - Definición del guard
 * @returns {Object} Resultado de validación
 */
export function validateGuard(guard) {
    const errors = [];
    
    if (!guard.name) errors.push('Guard must have a name');
    if (!guard.version) errors.push('Guard should have a version');
    if (!guard.domain) errors.push('Guard should specify a domain (use IssueDomains)');
    if (typeof guard.detect !== 'function') errors.push('Guard must have a detect function');
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * ============================================================================
 * EXPORT PRINCIPAL
 * ============================================================================
 */

export default {
    IssueDomains,
    IssueSeverity,
    StandardThresholds,
    StandardSuggestions,
    createIssueType,
    createStandardContext,
    severityFromComplexity,
    severityFromLines,
    severityFromImpact,
    severityFromSharedState,
    isValidGuardTarget,
    isLowSignalName,
    extractAtomMetrics,
    formatDuplicateMessage,
    formatImpactMessage,
    formatAsyncSafetyMessage,
    formatEventLeakMessage,
    validateGuard
};
