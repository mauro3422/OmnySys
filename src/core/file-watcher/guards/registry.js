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
import { buildRegistryStats } from './registry/stats.js';
import { registerGuard } from './registry/registration.js';
import { runGuardMap } from './registry/execution.js';
import { initializeDefaultGuards } from './registry/initialization.js';

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
        return {
            ...buildRegistryStats(this.semanticGuards, this.impactGuards, this.metadata),
            initialized: this.initialized
        };
    }

    #registerGuard(guardMap, type, name, guardFn, metadata = {}) {
        return registerGuard(guardMap, this.metadata, validateGuard, logger, type, name, guardFn, metadata);
    }

    async #runGuardMap(guardMap, type, rootPath, filePath, runner) {
        return runGuardMap({
            guardMap,
            type,
            rootPath,
            filePath,
            runner,
            logger,
            persistWatcherIssue,
            clearWatcherIssue
        });
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
        if (this.initialized) {
            return;
        }

        if (this.initializationPromise) {
            await this.initializationPromise;
            return;
        }

        const { registerAllDefaultSemanticGuards, registerAllDefaultImpactGuards } = await import('./default-guards.js');
        this.initializationPromise = initializeDefaultGuards({
            semanticGuards: this.semanticGuards,
            impactGuards: this.impactGuards,
            logger,
            registerAllDefaultSemanticGuards,
            registerAllDefaultImpactGuards,
            registry: this
        });

        try {
            await this.initializationPromise;
            this.initialized = true;
        } finally {
            this.initializationPromise = null;
        }
    }

    /**
     * Obtiene estadísticas de los guards
     * @returns {Object} Estadísticas
     */
    getRegistryStats() {
        const stats = statsPool.getStats('registry') || this.getLocalStats();
        logger.debug(`[GuardRegistry] getRegistryStats returning: ${JSON.stringify(stats).substring(0, 100)}`);
        return stats;
    }

    getStats() {
        return this.getRegistryStats();
    }
}

// Exportar singleton
export const guardRegistry = new GuardRegistry();
