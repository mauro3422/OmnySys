import { statsPool } from '../../../shared/utils/stats-pool.js';
/**
 * @fileoverview registry.js
 *
 * Registro centralizado de guardias (vigilantes) para el FileWatcher.
 * Permite desacoplar la lógica de validación del pipeline principal de análisis.
 * 
 * @version 2.0.0 - Estandarizado con guard-standards.js
 * @module core/file-watcher/guards/registry
 */

import { createLogger } from '../../../utils/logger.js';
import { validateGuard } from './guard-standards.js';
import { getMetadataFromMap, listMetadataItems } from '../../../shared/compiler/index.js';
import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';

const logger = createLogger('OmnySys:guards:registry');

class GuardRegistry {
    constructor() {
        this.semanticGuards = new Map();
        this.impactGuards = new Map();
        this.metadata = new Map(); // Metadata de cada guard
        this.initialized = false;
        this.initializationPromise = null;

        // Registrar en StatsPool
        statsPool.registerProvider('registry', () => this.getLocalStats());
    }

    /**
     * Obtiene estadísticas locales del registro
     * @returns {Object} Estadísticas formateadas
     */
    getLocalStats() {
        const byType = {
            semantic: this.semanticGuards.size,
            impact: this.impactGuards.size
        };

        const byDomain = {};
        for (const meta of this.metadata.values()) {
            const domain = meta.domain || 'unknown';
            byDomain[domain] = (byDomain[domain] || 0) + 1;
        }

        return {
            total: this.semanticGuards.size + this.impactGuards.size,
            byType,
            byDomain,
            initialized: this.initialized
        };
    }


    async #persistGuardCrash(rootPath, filePath, name, type, error) {
        const issueType = `runtime_${type}_guard_crash_${name}_high`;
        await persistWatcherIssue(
            rootPath,
            filePath,
            issueType,
            'high',
            `${type} guard '${name}' crashed: ${error.message}`,
            {
                source: 'guard_registry',
                guardName: name,
                guardType: type,
                errorName: error.name || 'Error',
                errorMessage: error.message,
                stack: error.stack || null
            }
        );
    }

    async #clearGuardCrash(rootPath, filePath, name, type) {
        const issueType = `runtime_${type}_guard_crash_${name}_high`;
        await clearWatcherIssue(rootPath, filePath, issueType);
    }

    #registerGuard(guardMap, type, name, guardFn, metadata = {}) {
        if (guardMap.has(name)) {
            logger.debug(`${type === 'semantic' ? 'Semantic' : 'Impact'} guard already registered: ${name}`);
            return false;
        }

        const validation = validateGuard({ name, detect: guardFn, ...metadata });
        if (!validation.valid) {
            logger.warn(`Guard '${name}' validation warnings:`, validation.errors);
        }

        guardMap.set(name, guardFn);
        this.metadata.set(name, {
            type,
            ...metadata,
            registeredAt: new Date().toISOString()
        });

        logger.debug(`Registered ${type} guard: ${name} (${metadata.domain || 'unknown'})`);
        return true;
    }

    async #runGuardMap(guardMap, type, rootPath, filePath, runner) {
        const results = {};

        for (const [name, guardFn] of guardMap.entries()) {
            const startTime = Date.now();
            try {
                results[name] = await runner(guardFn);
                await this.#clearGuardCrash(rootPath, filePath, name, type);
                const duration = Date.now() - startTime;

                if (duration > 100) {
                    logger.warn(`${type === 'semantic' ? 'Semantic' : 'Impact'} guard '${name}' took ${duration}ms (slow)`);
                }
            } catch (error) {
                logger.error(`Error in ${type} guard '${name}' for ${filePath}: ${error.message}`);
                await this.#persistGuardCrash(rootPath, filePath, name, type, error);
                results[name] = { error: error.message };
            }
        }

        return results;
    }

    /**
     * Registra un guardia semántico (se ejecuta durante analyzeAndIndex)
     * @param {string} name - Nombre único del guardia
     * @param {Function} guardFn - Función (rootPath, filePath, context, atoms, options) => Promise
     * @param {Object} metadata - Metadata del guard (domain, version, description)
     */
    registerSemanticGuard(name, guardFn, metadata = {}) {
        return this.#registerGuard(this.semanticGuards, 'semantic', name, guardFn, metadata);
    }

    /**
     * Registra un guardia de impacto (se ejecuta tras el análisis completo)
     * @param {string} name - Nombre único del guardia
     * @param {Function} guardFn - Función (rootPath, filePath, context, options) => Promise
     * @param {Object} metadata - Metadata del guard (domain, version, description)
     */
    registerImpactGuard(name, guardFn, metadata = {}) {
        return this.#registerGuard(this.impactGuards, 'impact', name, guardFn, metadata);
    }

    /**
     * Obtiene metadata de un guard registrado
     * @param {string} name - Nombre del guard
     * @returns {Object|null} Metadata del guard
     */
    getGuardMetadata(name) {
        return getMetadataFromMap(this.metadata, name);
    }

    /**
     * Lista todos los guards registrados
     * @returns {Array<Object>} Lista de guards con metadata
     */
    listGuards() {
        return listMetadataItems(this.metadata);
    }

    /**
     * Ejecuta todos los guardias semánticos
     */
    async runSemanticGuards(rootPath, filePath, context, atoms, options = {}) {
        return this.#runGuardMap(this.semanticGuards, 'semantic', rootPath, filePath, async (guardFn) => {
            return await guardFn(rootPath, filePath, context, atoms, options);
        });
    }

    /**
     * Ejecuta todos los guardias de impacto
     */
    async runImpactGuards(rootPath, filePath, context, options = {}) {
        return this.#runGuardMap(this.impactGuards, 'impact', rootPath, filePath, async (guardFn) => {
            return await guardFn(rootPath, filePath, context, options);
        });
    }

    /**
     * Inicializa los guardias por defecto del sistema
     */
    async initializeDefaultGuards() {
        if (this.initialized) return;
        if (this.initializationPromise) {
            await this.initializationPromise;
            return;
        }

        this.initializationPromise = (async () => {
            const { registerAllDefaultSemanticGuards, registerAllDefaultImpactGuards } = await import('./default-guards.js');
            await registerAllDefaultSemanticGuards(this);
            await registerAllDefaultImpactGuards(this);

            this.initialized = true;
            logger.info(`Guard registry initialized with ${this.semanticGuards.size} semantic and ${this.impactGuards.size} impact guards`);
        })();

        try {
            await this.initializationPromise;
        } finally {
            this.initializationPromise = null;
        }
    }

    /**
     * Obtiene estadísticas de los guards
     * @returns {Object} Estadísticas
     */
    getStats() {
        const stats = statsPool.getStats('registry') || this.getLocalStats();
        console.log(`[GuardRegistry] getStats returning:`, JSON.stringify(stats).substring(0, 100));
        return stats;
    }
}

// Exportar singleton
export const guardRegistry = new GuardRegistry();

