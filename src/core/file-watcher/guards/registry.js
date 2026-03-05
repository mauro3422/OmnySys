/**
 * @fileoverview registry.js
 *
 * Registro centralizado de guardias (vigilantes) para el FileWatcher.
 * Permite desacoplar la lógica de validación del pipeline principal de análisis.
 *
 * @module core/file-watcher/guards/registry
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:guards:registry');

class GuardRegistry {
    constructor() {
        this.semanticGuards = new Map();
        this.impactGuards = new Map();
        this.initialized = false;
    }

    /**
     * Registra un guardia semántico (se ejecuta durante analyzeAndIndex)
     * @param {string} name - Nombre único del guardia
     * @param {Function} guardFn - Función (rootPath, filePath, context, atoms, options) => Promise
     */
    registerSemanticGuard(name, guardFn) {
        if (this.semanticGuards.has(name)) {
            logger.warn(`Overwriting semantic guard: ${name}`);
        }
        this.semanticGuards.set(name, guardFn);
        logger.debug(`Registered semantic guard: ${name}`);
    }

    /**
     * Registra un guardia de impacto (se ejecuta tras el análisis completo)
     * @param {string} name - Nombre único del guardia
     * @param {Function} guardFn - Función (rootPath, filePath, context, options) => Promise
     */
    registerImpactGuard(name, guardFn) {
        if (this.impactGuards.has(name)) {
            logger.warn(`Overwriting impact guard: ${name}`);
        }
        this.impactGuards.set(name, guardFn);
        logger.debug(`Registered impact guard: ${name}`);
    }

    /**
     * Ejecuta todos los guardias semánticos
     */
    async runSemanticGuards(rootPath, filePath, context, atoms, options = {}) {
        const results = {};
        for (const [name, guardFn] of this.semanticGuards.entries()) {
            try {
                results[name] = await guardFn(rootPath, filePath, context, atoms, options);
            } catch (error) {
                logger.error(`Error in semantic guard '${name}' for ${filePath}: ${error.message}`);
            }
        }
        return results;
    }

    /**
     * Ejecuta todos los guardias de impacto
     */
    async runImpactGuards(rootPath, filePath, context, options = {}) {
        const results = {};
        for (const [name, guardFn] of this.impactGuards.entries()) {
            try {
                results[name] = await guardFn(rootPath, filePath, context, options);
            } catch (error) {
                logger.error(`Error in impact guard '${name}' for ${filePath}: ${error.message}`);
            }
        }
        return results;
    }

    /**
     * Inicializa los guardias por defecto del sistema
     */
    async initializeDefaultGuards() {
        if (this.initialized) return;

        // 1. Semantic Guards
        const { detectSharedStateContention } = await import('./shared-state-guard.js');
        const { detectIntegrityViolations } = await import('./integrity-guard.js');
        const { examplePluginGuard } = await import('./example-plugin-guard.js');

        this.registerSemanticGuard('shared-state', detectSharedStateContention);
        this.registerSemanticGuard('atomic-integrity', detectIntegrityViolations);
        this.registerSemanticGuard('technical-debt-todo', examplePluginGuard);

        // 2. Impact Guards
        const { detectImpactWave } = await import('./impact-wave.js');
        const { detectDuplicateRisk } = await import('./duplicate-risk.js');
        const { detectCircularDependencies } = await import('./circular-guard.js');

        this.registerImpactGuard('impact-wave', async (rootPath, filePath, context, options) => {
            // Adaptador para la firma actual de detectImpactWave
            const previousAtoms = options.previousAtoms || [];
            return await detectImpactWave(rootPath, filePath, previousAtoms, context, async (fp) => await context.getAtomsForFile(fp), options);
        });

        this.registerImpactGuard('duplicate-risk', detectDuplicateRisk);

        this.registerImpactGuard('circular-dependencies', async (rootPath, filePath, context, options) => {
            const { getRepository } = await import('#layer-c/storage/repository/index.js');
            const repo = getRepository(rootPath);
            return await detectCircularDependencies(rootPath, filePath, repo);
        });

        this.initialized = true;
        logger.info('System guards initialized via Registry');
    }
}

// Exportar singleton
export const guardRegistry = new GuardRegistry();
export default guardRegistry;
