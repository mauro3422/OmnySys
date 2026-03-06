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

const logger = createLogger('OmnySys:guards:registry');

class GuardRegistry {
    constructor() {
        this.semanticGuards = new Map();
        this.impactGuards = new Map();
        this.metadata = new Map(); // Metadata de cada guard
        this.initialized = false;
    }

    /**
     * Registra un guardia semántico (se ejecuta durante analyzeAndIndex)
     * @param {string} name - Nombre único del guardia
     * @param {Function} guardFn - Función (rootPath, filePath, context, atoms, options) => Promise
     * @param {Object} metadata - Metadata del guard (domain, version, description)
     */
    registerSemanticGuard(name, guardFn, metadata = {}) {
        if (this.semanticGuards.has(name)) {
            logger.warn(`Overwriting semantic guard: ${name}`);
        }
        
        // Validación básica
        const validation = validateGuard({ name, detect: guardFn, ...metadata });
        if (!validation.valid) {
            logger.warn(`Guard '${name}' validation warnings:`, validation.errors);
        }
        
        this.semanticGuards.set(name, guardFn);
        this.metadata.set(name, {
            type: 'semantic',
            ...metadata,
            registeredAt: new Date().toISOString()
        });
        
        logger.debug(`Registered semantic guard: ${name} (${metadata.domain || 'unknown'})`);
    }

    /**
     * Registra un guardia de impacto (se ejecuta tras el análisis completo)
     * @param {string} name - Nombre único del guardia
     * @param {Function} guardFn - Función (rootPath, filePath, context, options) => Promise
     * @param {Object} metadata - Metadata del guard (domain, version, description)
     */
    registerImpactGuard(name, guardFn, metadata = {}) {
        if (this.impactGuards.has(name)) {
            logger.warn(`Overwriting impact guard: ${name}`);
        }
        
        // Validación básica
        const validation = validateGuard({ name, detect: guardFn, ...metadata });
        if (!validation.valid) {
            logger.warn(`Guard '${name}' validation warnings:`, validation.errors);
        }
        
        this.impactGuards.set(name, guardFn);
        this.metadata.set(name, {
            type: 'impact',
            ...metadata,
            registeredAt: new Date().toISOString()
        });
        
        logger.debug(`Registered impact guard: ${name} (${metadata.domain || 'unknown'})`);
    }

    /**
     * Obtiene metadata de un guard registrado
     * @param {string} name - Nombre del guard
     * @returns {Object|null} Metadata del guard
     */
    getGuardMetadata(name) {
        return this.metadata.get(name) || null;
    }

    /**
     * Lista todos los guards registrados
     * @returns {Array<Object>} Lista de guards con metadata
     */
    listGuards() {
        const guards = [];
        
        for (const [name, meta] of this.metadata.entries()) {
            guards.push({
                name,
                type: meta.type,
                domain: meta.domain,
                version: meta.version,
                description: meta.description,
                registeredAt: meta.registeredAt
            });
        }
        
        return guards;
    }

    /**
     * Ejecuta todos los guardias semánticos
     */
    async runSemanticGuards(rootPath, filePath, context, atoms, options = {}) {
        const results = {};
        
        for (const [name, guardFn] of this.semanticGuards.entries()) {
            const startTime = Date.now();
            try {
                results[name] = await guardFn(rootPath, filePath, context, atoms, options);
                const duration = Date.now() - startTime;
                
                if (duration > 100) {
                    logger.warn(`Semantic guard '${name}' took ${duration}ms (slow)`);
                }
            } catch (error) {
                logger.error(`Error in semantic guard '${name}' for ${filePath}: ${error.message}`);
                results[name] = { error: error.message };
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
            const startTime = Date.now();
            try {
                results[name] = await guardFn(rootPath, filePath, context, options);
                const duration = Date.now() - startTime;
                
                if (duration > 100) {
                    logger.warn(`Impact guard '${name}' took ${duration}ms (slow)`);
                }
            } catch (error) {
                logger.error(`Error in impact guard '${name}' for ${filePath}: ${error.message}`);
                results[name] = { error: error.message };
            }
        }
        
        return results;
    }

    /**
     * Inicializa los guardias por defecto del sistema
     */
    async initializeDefaultGuards() {
        if (this.initialized) return;

        // ===================================================================
        // 1. SEMANTIC GUARDS (Ejecutan post-extracción atómica)
        // ===================================================================
        
        // 1.1 Shared State Contention (radioactive atoms)
        const { detectSharedStateContention } = await import('./shared-state-guard.js');
        this.registerSemanticGuard('shared-state', detectSharedStateContention, {
            domain: 'sem',
            version: '2.0.0',
            description: 'Detects excessive shared state contention (radioactive atoms)'
        });

        // 1.2 Atomic Integrity (data-flow coherence)
        const { detectIntegrityViolations } = await import('./integrity-guard.js');
        this.registerSemanticGuard('atomic-integrity', detectIntegrityViolations, {
            domain: 'sem',
            version: '2.0.0',
            description: 'Validates data-flow coherence and detects unused inputs'
        });

        // 1.3 Async Safety (nuevo)
        const { detectAsyncSafetyIssues } = await import('./async-safety-guard.js');
        this.registerSemanticGuard('async-safety', detectAsyncSafetyIssues, {
            domain: 'runtime',
            version: '1.0.0',
            description: 'Detects async functions without proper error handling'
        });

        const { detectMetadataCompleteness } = await import('./metadata-completeness-guard.js');
        this.registerSemanticGuard('metadata-completeness', detectMetadataCompleteness, {
            domain: 'code',
            version: '1.0.0',
            description: 'Detects production atoms missing derived compiler metadata'
        });

        // 1.4 Complexity Monitor (nuevo)
        const { detectHighComplexity } = await import('./complexity-guard.js');
        this.registerSemanticGuard('complexity-monitor', detectHighComplexity, {
            domain: 'code',
            version: '1.0.0',
            description: 'Monitors cyclomatic complexity and function length'
        });

        // 1.5 Event Leak Detector (nuevo)
        const { detectEventLeaks } = await import('./event-leak-guard.js');
        this.registerSemanticGuard('event-leak', detectEventLeaks, {
            domain: 'runtime',
            version: '1.0.0',
            description: 'Detects potential event listener memory leaks'
        });

        // 1.6 Dead Code Alert (nuevo)
        const { detectDeadCode } = await import('./dead-code-guard.js');
        this.registerSemanticGuard('dead-code', detectDeadCode, {
            domain: 'code',
            version: '1.0.0',
            description: 'Alerts on newly created dead code'
        });

        // ===================================================================
        // 2. IMPACT GUARDS (Ejecutan post-indexación)
        // ===================================================================

        // 2.1 Impact Wave (blast radius analysis)
        const { detectImpactWave } = await import('./impact-wave.js');
        this.registerImpactGuard('impact-wave', async (rootPath, filePath, context, options) => {
            const previousAtoms = options.previousAtoms || [];
            return await detectImpactWave(
                rootPath, 
                filePath, 
                previousAtoms, 
                context, 
                async (fp) => await context.getAtomsForFile(fp), 
                options
            );
        }, {
            domain: 'arch',
            version: '2.0.0',
            description: 'Analyzes blast radius of changes (impact wave)'
        });

        // 2.2 Duplicate Risk (DNA-based duplication)
        const { detectDuplicateRisk } = await import('./duplicate-risk.js');
        this.registerImpactGuard('duplicate-risk', detectDuplicateRisk, {
            domain: 'code',
            version: '2.0.0',
            description: 'Detects duplicate symbols by DNA hash'
        });

        // 2.3 Circular Dependencies
        const { detectCircularDependencies } = await import('./circular-guard.js');
        this.registerImpactGuard('circular-dependencies', async (rootPath, filePath, context, options) => {
            const { getRepository } = await import('#layer-c/storage/repository/index.js');
            const repo = getRepository(rootPath);
            return await detectCircularDependencies(rootPath, filePath, repo);
        }, {
            domain: 'arch',
            version: '2.0.0',
            description: 'Detects circular import and call dependencies'
        });

        // 2.4 Hotspot Detector (nuevo)
        const { detectHotspots } = await import('./hotspot-guard.js');
        this.registerImpactGuard('hotspot-detector', detectHotspots, {
            domain: 'perf',
            version: '1.0.0',
            description: 'Detects frequently changing code (hotspots)'
        });

        // 2.5 Pipeline Health (migrado de pipeline-alert-guard.js)
        const { detectPipelineIssues } = await import('./pipeline-health-guard.js');
        this.registerImpactGuard('pipeline-health', detectPipelineIssues, {
            domain: 'code',
            version: '1.0.0',
            description: 'Monitors pipeline health (shadow volume, zero atoms)'
        });

        const { detectTopologyRegression } = await import('./topology-regression-guard.js');
        this.registerImpactGuard('topology-regression', detectTopologyRegression, {
            domain: 'arch',
            version: '1.0.0',
            description: 'Detects sudden loss of topology signal after a file change'
        });

        const { detectSemanticCoverage } = await import('./semantic-coverage-guard.js');
        this.registerImpactGuard('semantic-coverage', detectSemanticCoverage, {
            domain: 'sem',
            version: '1.0.0',
            description: 'Detects code patterns not reflected in semantic metadata'
        });

        this.initialized = true;
        logger.info(`Guard registry initialized with ${this.semanticGuards.size} semantic and ${this.impactGuards.size} impact guards`);
    }

    /**
     * Obtiene estadísticas de los guards
     * @returns {Object} Estadísticas
     */
    getStats() {
        const guards = this.listGuards();
        const byDomain = {};
        const byType = { semantic: 0, impact: 0 };
        
        for (const guard of guards) {
            byDomain[guard.domain] = (byDomain[guard.domain] || 0) + 1;
            byType[guard.type]++;
        }
        
        return {
            total: guards.length,
            byType,
            byDomain,
            guards: guards.map(g => g.name)
        };
    }
}

// Exportar singleton
export const guardRegistry = new GuardRegistry();
export default guardRegistry;
