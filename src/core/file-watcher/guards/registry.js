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
        if (this.semanticGuards.has(name)) {
            logger.debug(`Semantic guard already registered: ${name}`);
            return false;
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
        return true;
    }

    /**
     * Registra un guardia de impacto (se ejecuta tras el análisis completo)
     * @param {string} name - Nombre único del guardia
     * @param {Function} guardFn - Función (rootPath, filePath, context, options) => Promise
     * @param {Object} metadata - Metadata del guard (domain, version, description)
     */
    registerImpactGuard(name, guardFn, metadata = {}) {
        if (this.impactGuards.has(name)) {
            logger.debug(`Impact guard already registered: ${name}`);
            return false;
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
        return true;
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
        const results = {};
        
        for (const [name, guardFn] of this.semanticGuards.entries()) {
            const startTime = Date.now();
            try {
                results[name] = await guardFn(rootPath, filePath, context, atoms, options);
                await this.#clearGuardCrash(rootPath, filePath, name, 'semantic');
                const duration = Date.now() - startTime;
                
                if (duration > 100) {
                    logger.warn(`Semantic guard '${name}' took ${duration}ms (slow)`);
                }
            } catch (error) {
                logger.error(`Error in semantic guard '${name}' for ${filePath}: ${error.message}`);
                await this.#persistGuardCrash(rootPath, filePath, name, 'semantic', error);
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
                await this.#clearGuardCrash(rootPath, filePath, name, 'impact');
                const duration = Date.now() - startTime;
                
                if (duration > 100) {
                    logger.warn(`Impact guard '${name}' took ${duration}ms (slow)`);
                }
            } catch (error) {
                logger.error(`Error in impact guard '${name}' for ${filePath}: ${error.message}`);
                await this.#persistGuardCrash(rootPath, filePath, name, 'impact', error);
                results[name] = { error: error.message };
            }
        }
        
        return results;
    }

    /**
     * Registra los guards semánticos por defecto
     */
    async registerDefaultSemanticGuards() {
        // 1.1 Shared State Contention (radioactive atoms)
        const { detectSharedStateContention } = await import('./shared-state-guard.js');
        this.registerSemanticGuard('shared-state', detectSharedStateContention, {
            domain: 'sem',
            version: '2.0.0',
            description: 'Detects excessive shared state contention (radioactive atoms)'
        });

        // 1.2 Data-flow Integrity (coherence, dead variables)
        const { detectIntegrityViolations } = await import('./integrity-guard.js');
        this.registerSemanticGuard('atomic-integrity', detectIntegrityViolations, {
            domain: 'sem',
            version: '2.0.0',
            description: 'Validates data-flow coherence and detects unused inputs'
        });

        // 1.3 Async Safety
        const { detectAsyncSafetyIssues } = await import('./async-safety-guard.js');
        this.registerSemanticGuard('async-safety', detectAsyncSafetyIssues, {
            domain: 'runtime',
            version: '1.0.0',
            description: 'Detects async functions without proper error handling'
        });

        // 1.4 Metadata Completeness
        const { detectMetadataCompleteness } = await import('./metadata-completeness-guard.js');
        this.registerSemanticGuard('metadata-completeness', detectMetadataCompleteness, {
            domain: 'code',
            version: '1.0.0',
            description: 'Detects production atoms missing derived compiler metadata'
        });

        // 1.5 Compiler Policy Conformance
        const { detectCompilerPolicyConformance } = await import('./compiler-policy-conformance-guard.js');
        this.registerSemanticGuard('compiler-policy-conformance', detectCompilerPolicyConformance, {
            domain: 'arch',
            version: '1.0.0',
            description: 'Detects ad-hoc compiler policy implementations instead of canonical shared APIs'
        });

        // 1.6 High Complexity
        const { detectHighComplexity } = await import('./complexity-guard.js');
        this.registerSemanticGuard('complexity-monitor', detectHighComplexity, {
            domain: 'code',
            version: '1.0.0',
            description: 'Monitors cyclomatic complexity and function length'
        });

        // 1.7 Event Leak
        const { detectEventLeaks } = await import('./event-leak-guard.js');
        this.registerSemanticGuard('event-leak', detectEventLeaks, {
            domain: 'runtime',
            version: '1.0.0',
            description: 'Detects potential event listener memory leaks'
        });

        // 1.8 Dead Code
        const { detectDeadCode } = await import('./dead-code-guard.js');
        this.registerSemanticGuard('dead-code', detectDeadCode, {
            domain: 'code',
            version: '1.0.0',
            description: 'Alerts on newly created dead code'
        });
    }

    /**
     * Registra los guards de impacto por defecto
     */
    async registerDefaultImpactGuards() {
        // ===================================================================
        // 2. IMPACT GUARDS (Ejecutan post-análisis completo)
        // ===================================================================

        // Analysis & Architecture Guards
        await this.#registerAnalysisGuards();

        // Duplicate Detection Guards
        await this.#registerDuplicateGuards();

        // Dependency & Topology Guards
        await this.#registerDependencyGuards();

        // Pipeline Health Guards
        await this.#registerPipelineGuards();

        // Semantic Quality Guards
        await this.#registerSemanticGuards();

        // Runtime Health Guards
        await this.#registerRuntimeGuards();
    }

    /**
     * Registra guards de análisis y arquitectura
     */
    async #registerAnalysisGuards() {
        // 2.1 Impact Wave Analysis
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

        // 2.5 Pipeline Health
        const { detectPipelineIssues } = await import('./pipeline-health-guard.js');
        this.registerImpactGuard('pipeline-health', detectPipelineIssues, {
            domain: 'code',
            version: '1.0.0',
            description: 'Monitors pipeline health (shadow volume, zero atoms)'
        });

        // 2.6 Topology Regression
        const { detectTopologyRegression } = await import('./topology-regression-guard.js');
        this.registerImpactGuard('topology-regression', detectTopologyRegression, {
            domain: 'arch',
            version: '1.0.0',
            description: 'Detects sudden loss of topology signal after a file change'
        });
    }

    /**
     * Registra guards de detección de duplicados
     */
    async #registerDuplicateGuards() {
        // 2.2 Duplicate Risk
        const { detectDuplicateRisk } = await import('./duplicate-risk.js');
        this.registerImpactGuard('duplicate-risk', detectDuplicateRisk, {
            domain: 'code',
            version: '2.0.0',
            description: 'Detects duplicate symbols by DNA hash'
        });

        // 2.11 Conceptual Duplicate Risk
        const { detectConceptualDuplicateRisk } = await import('./conceptual-duplicate-risk.js');
        this.registerImpactGuard('conceptual-duplicate-risk', detectConceptualDuplicateRisk, {
            domain: 'code',
            version: '1.0.0',
            description: 'Detects mirror atoms - functions with same semantic purpose but different implementations'
        });

        // 2.12 Unified Duplicate Risk (Structural + Conceptual Coordinator)
        const { detectUnifiedDuplicateRisk } = await import('./unified-duplicate-guard.js');
        this.registerImpactGuard('unified-duplicate-risk', detectUnifiedDuplicateRisk, {
            domain: 'code',
            version: '1.0.0',
            description: 'Unified coordinator for structural (DNA) and conceptual (semantic) duplicate detection'
        });
    }

    /**
     * Registra guards de dependencias y topología
     */
    async #registerDependencyGuards() {
        // 2.3 Circular Dependencies
        const { detectCircularDependencies } = await import('./circular-guard.js');
        this.registerImpactGuard('circular-dependencies', async (rootPath, filePath) => {
            const { getRepository } = await import('#layer-c/storage/repository/index.js');
            const repo = getRepository(rootPath);
            return await detectCircularDependencies(rootPath, filePath, repo);
        }, {
            domain: 'arch',
            version: '2.0.0',
            description: 'Detects circular import and call dependencies'
        });

        // 2.4 Hotspot Detection
        const { detectHotspots } = await import('./hotspot-guard.js');
        this.registerImpactGuard('hotspot-detector', detectHotspots, {
            domain: 'perf',
            version: '1.0.0',
            description: 'Detects frequently changing code (hotspots)'
        });
    }

    /**
     * Registra guards de salud del pipeline
     */
    async #registerPipelineGuards() {
        // 2.7 Pipeline Orphans
        const { detectPipelineOrphans } = await import('./pipeline-orphan-guard.js');
        this.registerImpactGuard('pipeline-orphan', detectPipelineOrphans, {
            domain: 'arch',
            version: '1.0.0',
            description: 'Detects exported pipeline atoms that became disconnected after a change'
        });
    }

    /**
     * Registra guards de calidad semántica
     */
    async #registerSemanticGuards() {
        // 2.8 Semantic Coverage
        const { detectSemanticCoverage } = await import('./semantic-coverage-guard.js');
        this.registerImpactGuard('semantic-coverage', detectSemanticCoverage, {
            domain: 'sem',
            version: '1.0.0',
            description: 'Detects code patterns not reflected in semantic metadata'
        });

        // 2.9 Semantic Persistence
        const { detectSemanticPersistence } = await import('./semantic-persistence-guard.js');
        this.registerImpactGuard('semantic-persistence', detectSemanticPersistence, {
            domain: 'sem',
            version: '1.0.0',
            description: 'Detects atoms whose semantic compiler metadata was dropped during persistence'
        });
    }

    /**
     * Registra guards de salud del runtime
     */
    async #registerRuntimeGuards() {
        // 2.10 Runtime Registry Health
        const { detectRuntimeRegistryHealth } = await import('./runtime-registry-health-guard.js');
        this.registerImpactGuard('runtime-registry-health', detectRuntimeRegistryHealth, {
            domain: 'runtime',
            version: '1.0.0',
            description: 'Detects idempotency issues, churn, and leaks in runtime registries'
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
            await this.registerDefaultSemanticGuards();
            await this.registerDefaultImpactGuards();
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
