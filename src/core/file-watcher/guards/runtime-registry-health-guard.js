/**
 * @fileoverview runtime-registry-health-guard.js
 *
 * Detecta problemas de salud en registries runtime:
 * - Re-registro por nombre (idempotencia rota)
 * - Churn por reload (inicializaciones repetidas)
 * - Inicializaciones concurrentes (race conditions)
 * - Registry leak (crecimiento indefinido)
 *
 * @module core/file-watcher/guards/runtime-registry-health
 * @version 1.0.0
 */

import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext
} from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:runtime-registry-health');

// Thresholds
const MAX_EXPECTED_GUARDS = 50; // Límite razonable de guards por tipo
const MAX_INIT_CALLS = 3; // Máximo de inicializaciones esperadas por ciclo

/**
 * Estado trackeado para detectar churn
 * @type {Map<string, Object>}
 */
const registryStats = new Map();

/**
 * Detecta issues de salud en registries runtime
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array<Object>>} Issues detectados
 */
export async function detectRuntimeRegistryHealth(rootPath, filePath, EventEmitterContext, options = {}) {
    const {
        verbose = false,
        registrySnapshot = null // Snapshot opcional del estado del registry
    } = options;

    try {
        const issues = [];

        // Solo analizar archivos relevantes (registry.js o similares)
        if (!filePath.includes('registry') && !filePath.includes('Registry')) {
            return [];
        }

        const stats = getOrCreateStats(filePath);

        // 1. Detectar re-registro (si hay snapshot con duplicados)
        if (registrySnapshot) {
            const duplicates = findDuplicateRegistrations(registrySnapshot);
            if (duplicates.length > 0) {
                const severity = 'high';
                const issueType = createIssueType(IssueDomains.RUNTIME, 'registry_idempotency', severity);

                issues.push({
                    severity,
                    issueType,
                    check: 'duplicate_registration',
                    message: `Registry has ${duplicates.length} duplicate registrations by name`,
                    context: createStandardContext({
                        guardName: 'runtime-registry-health-guard',
                        metricValue: duplicates.length,
                        threshold: 0,
                        severity,
                        suggestedAction: 'Make registry registration idempotent by name. Check register*Guard methods.',
                        suggestedAlternatives: [
                            'Add has() check before registration',
                            'Use debug log instead of warn for duplicates',
                            'Implement initialization lock to prevent race conditions'
                        ],
                        extraData: {
                            duplicates: duplicates.slice(0, 5), // Limitar output
                            totalDuplicates: duplicates.length,
                            registryFile: filePath
                        }
                    })
                });
            }
        }

        // 2. Detectar churn por reload (inicializaciones repetidas)
        stats.initCalls++;
        if (stats.initCalls > MAX_INIT_CALLS) {
            const severity = 'medium';
            const issueType = createIssueType(IssueDomains.RUNTIME, 'registry_churn', severity);

            issues.push({
                severity,
                issueType,
                check: 'initialization_churn',
                message: `Registry initialized ${stats.initCalls} times (possible reload churn)`,
                context: createStandardContext({
                    guardName: 'runtime-registry-health-guard',
                    metricValue: stats.initCalls,
                    threshold: MAX_INIT_CALLS,
                    severity,
                    suggestedAction: 'Review initialization patterns. Consider if initializeDefaultGuards() is being called too often.',
                    suggestedAlternatives: [
                        'Add initialized flag check at entry points',
                        'Use singleton pattern with proper lifecycle',
                        'Defer initialization to first actual use'
                    ],
                    extraData: {
                        initCalls: stats.initCalls,
                        lastInitTime: stats.lastInitTime,
                        timeSinceLastInit: Date.now() - stats.lastInitTime
                    }
                })
            });
        }
        stats.lastInitTime = Date.now();

        // 3. Detectar registry leak (crecimiento indefinido)
        if (registrySnapshot) {
            const totalSize = (registrySnapshot.semanticGuards?.size || 0) +
                             (registrySnapshot.impactGuards?.size || 0);
            
            if (totalSize > MAX_EXPECTED_GUARDS) {
                const severity = 'medium';
                const issueType = createIssueType(IssueDomains.RUNTIME, 'registry_leak', severity);

                issues.push({
                    severity,
                    issueType,
                    check: 'registry_growth',
                    message: `Registry has grown to ${totalSize} guards (possible leak)`,
                    context: createStandardContext({
                        guardName: 'runtime-registry-health-guard',
                        metricValue: totalSize,
                        threshold: MAX_EXPECTED_GUARDS,
                        severity,
                        suggestedAction: 'Review if guards are being properly cleaned up. Consider implementing unregister methods.',
                        suggestedAlternatives: [
                            'Add cleanup on module unload',
                            'Implement registry size limits',
                            'Periodically compact registry'
                        ],
                        extraData: {
                            totalSize,
                            semanticGuards: registrySnapshot.semanticGuards?.size || 0,
                            impactGuards: registrySnapshot.impactGuards?.size || 0
                        }
                    })
                });
            }

            // 4. Detectar race condition en inicialización
            if (registrySnapshot.initializationPromise && !registrySnapshot.initialized) {
                const timeInInit = Date.now() - (stats.initStartTime || Date.now());
                if (timeInInit > 5000) { // Más de 5 segundos en inicialización
                    const severity = 'low';
                    const issueType = createIssueType(IssueDomains.RUNTIME, 'registry_race_condition', severity);

                    issues.push({
                        severity,
                        issueType,
                        check: 'slow_initialization',
                        message: `Registry initialization in progress for ${timeInInit}ms (possible race)`,
                        context: createStandardContext({
                            guardName: 'runtime-registry-health-guard',
                            metricValue: timeInInit,
                            threshold: 5000,
                            severity,
                            suggestedAction: 'Check if initializeDefaultGuards() is being called concurrently.',
                            suggestedAlternatives: [
                                'Ensure initializationPromise lock is working',
                                'Add timeout to initialization',
                                'Review async imports for deadlocks'
                            ],
                            extraData: {
                                timeInInit,
                                hasInitPromise: !!registrySnapshot.initializationPromise,
                                isInitialized: registrySnapshot.initialized
                            }
                        })
                    });
                }
            }
        }

        // Emitir evento si hay issues
        if (issues.length > 0) {
            EventEmitterContext.emit('runtime:registry-health', {
                filePath,
                totalIssues: issues.length,
                checks: issues.map(i => ({
                    check: i.check,
                    severity: i.severity,
                    message: i.message
                }))
            });

            if (verbose) {
                logger.warn(`[RUNTIME-REGISTRY-HEALTH] ${filePath}: ${issues.length} issue(s) detected`);
            }
        }

        return issues;

    } catch (error) {
        logger.debug(`[RUNTIME-REGISTRY-HEALTH GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

/**
 * Obtiene o crea estadísticas para un archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Object} Estadísticas
 */
function getOrCreateStats(filePath) {
    if (!registryStats.has(filePath)) {
        registryStats.set(filePath, {
            initCalls: 0,
            lastInitTime: 0,
            initStartTime: 0,
            registrations: new Map()
        });
    }
    return registryStats.get(filePath);
}

/**
 * Encuentra registros duplicados por nombre
 * @param {Object} snapshot - Snapshot del registry
 * @returns {Array<Object>} Duplicados encontrados
 */
function findDuplicateRegistrations(snapshot) {
    const duplicates = [];
    const seen = new Set();

    // Revisar semantic guards
    if (snapshot.semanticGuards) {
        for (const [name, count] of snapshot.semanticGuards.entries()) {
            if (seen.has(name)) {
                duplicates.push({ name, type: 'semantic', count });
            } else {
                seen.add(name);
            }
        }
    }

    // Revisar impact guards
    if (snapshot.impactGuards) {
        for (const [name, count] of snapshot.impactGuards.entries()) {
            if (seen.has(name)) {
                duplicates.push({ name, type: 'impact', count });
            } else {
                seen.add(name);
            }
        }
    }

    return duplicates;
}

/**
 * Resetea las estadísticas (útil para tests)
 */
export function resetRegistryStats() {
    registryStats.clear();
}

/**
 * Obtiene estadísticas actuales
 * @returns {Object} Estadísticas
 */
export function getRegistryStats() {
    const stats = {};
    for (const [filePath, data] of registryStats.entries()) {
        stats[filePath] = {
            initCalls: data.initCalls,
            lastInitTime: data.lastInitTime
        };
    }
    return stats;
}

export default detectRuntimeRegistryHealth;
