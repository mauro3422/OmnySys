/**
 * @fileoverview default-guards.js
 *
 * Contiene el boilerplate de registro de la lista de guards por defecto.
 * Extraído de registry.js para mantener la clase GuardRegistry más limpia y modular.
 *
 * @module core/file-watcher/guards/default-guards
 */

export async function registerAllDefaultSemanticGuards(registry) {
    try {
        // 1.1 Shared State Contention (radioactive atoms)
        const { detectSharedStateContention } = await import('./shared-state-guard.js');
        registry.registerSemanticGuard('shared-state', detectSharedStateContention, {
            domain: 'sem', version: '2.0.0', description: 'Detects excessive shared state contention (radioactive atoms)'
        });

        // 1.2 Data-flow Integrity (coherence, dead variables)
        const { detectIntegrityViolations } = await import('./integrity-guard.js');
        registry.registerSemanticGuard('atomic-integrity', detectIntegrityViolations, {
            domain: 'sem', version: '2.0.0', description: 'Validates data-flow coherence and detects unused inputs'
        });

        // 1.3 Async Safety
        const { detectAsyncSafetyIssues } = await import('./async-safety-guard.js');
        registry.registerSemanticGuard('async-safety', detectAsyncSafetyIssues, {
            domain: 'runtime', version: '1.0.0', description: 'Detects async functions without proper error handling'
        });

        // 1.4 Metadata Completeness
        const { detectMetadataCompleteness } = await import('./metadata-completeness-guard.js');
        registry.registerSemanticGuard('metadata-completeness', detectMetadataCompleteness, {
            domain: 'code', version: '1.0.0', description: 'Detects production atoms missing derived compiler metadata'
        });

        // 1.5 Compiler Policy Conformance
        const { detectCompilerPolicyConformance } = await import('./compiler-policy-conformance-guard.js');
        registry.registerSemanticGuard('compiler-policy-conformance', detectCompilerPolicyConformance, {
            domain: 'arch', version: '1.0.0', description: 'Detects ad-hoc compiler policy implementations instead of canonical shared APIs'
        });

        // 1.6 High Complexity
        const { detectHighComplexity } = await import('./complexity-guard.js');
        registry.registerSemanticGuard('complexity-monitor', detectHighComplexity, {
            domain: 'code', version: '1.0.0', description: 'Monitors cyclomatic complexity and function length'
        });

        // 1.7 Event Leak
        const { detectEventLeaks } = await import('./event-leak-guard.js');
        registry.registerSemanticGuard('event-leak', detectEventLeaks, {
            domain: 'runtime', version: '1.0.0', description: 'Detects potential event listener memory leaks'
        });

        // 1.8 Dead Code
        const { detectDeadCode } = await import('./dead-code-guard.js');
        registry.registerSemanticGuard('dead-code', detectDeadCode, {
            domain: 'code', version: '1.0.0', description: 'Alerts on newly created dead code'
        });

        // 1.9 Governance: File Size Limits
        const { detectFileSizeLimits } = await import('./governance/file-size-guard.js');
        registry.registerSemanticGuard('file-size-monitor', detectFileSizeLimits, {
            domain: 'code', version: '1.0.0', description: 'Monitors total file length to prevent gigantic files that break AI context ceilings'
        });

        // 1.10 Governance: Canonical Dependencies
        const { detectCanonicalDependencies } = await import('./governance/canonical-dependency-guard.js');
        registry.registerSemanticGuard('canonical-dependency-monitor', detectCanonicalDependencies, {
            domain: 'arch', version: '1.0.0', description: 'Detects abstractions that bypass canonical APIs and read raw tables'
        });

        // 1.11 Governance: Advisory Inferences
        const { detectAdvisoryInferences } = await import('./governance/advisory-inference-guard.js');
        registry.registerSemanticGuard('advisory-inference-monitor', detectAdvisoryInferences, {
            domain: 'arch', version: '1.0.0', description: 'Detects trust in advisory surfaces without validating their integrity metadata first'
        });
    } catch (error) {
        throw new Error(`Failed to register default semantic guards: ${error.message}`);
    }
}

export async function registerAllDefaultImpactGuards(registry) {
    try {
        // 2.1 Impact Wave Analysis
        const { detectImpactWave } = await import('./impact-wave.js');
        registry.registerImpactGuard('impact-wave', async (rootPath, filePath, context, options) => {
            const previousAtoms = options.previousAtoms || [];
            return await detectImpactWave(rootPath, filePath, previousAtoms, context, async (fp) => await context.getAtomsForFile(fp), options);
        }, { domain: 'arch', version: '2.0.0', description: 'Analyzes blast radius of changes (impact wave)' });

        // 2.2 Duplicate Risk
        const { detectDuplicateRisk } = await import('./duplicate-risk.js');
        registry.registerImpactGuard('duplicate-risk', detectDuplicateRisk, {
            domain: 'code', version: '2.0.0', description: 'Detects duplicate symbols by DNA hash'
        });

        // 2.3 Circular Dependencies
        const { detectCircularDependencies } = await import('./circular-guard.js');
        registry.registerImpactGuard('circular-dependencies', async (rootPath, filePath) => {
            const { getRepository } = await import('#layer-c/storage/repository/index.js');
            return await detectCircularDependencies(rootPath, filePath, getRepository(rootPath));
        }, { domain: 'arch', version: '2.0.0', description: 'Detects circular import and call dependencies' });

        // 2.4 Hotspot Detection
        const { detectHotspots } = await import('./hotspot-guard.js');
        registry.registerImpactGuard('hotspot-detector', detectHotspots, {
            domain: 'perf', version: '1.0.0', description: 'Detects frequently changing code (hotspots)'
        });

        // 2.5 Pipeline Health
        const { detectPipelineIssues } = await import('./pipeline-health-guard.js');
        registry.registerImpactGuard('pipeline-health', detectPipelineIssues, {
            domain: 'code', version: '1.0.0', description: 'Monitors pipeline health (shadow volume, zero atoms)'
        });

        // 2.6 Topology Regression
        const { detectTopologyRegression } = await import('./topology-regression-guard.js');
        registry.registerImpactGuard('topology-regression', detectTopologyRegression, {
            domain: 'arch', version: '1.0.0', description: 'Detects sudden loss of topology signal after a file change'
        });

        // 2.7 Pipeline Orphans
        const { detectPipelineOrphans } = await import('./pipeline-orphan-guard.js');
        registry.registerImpactGuard('pipeline-orphan', detectPipelineOrphans, {
            domain: 'arch', version: '1.0.0', description: 'Detects exported pipeline atoms that became disconnected after a change'
        });

        // 2.8 Semantic Coverage
        const { detectSemanticCoverage } = await import('./semantic-coverage-guard.js');
        registry.registerImpactGuard('semantic-coverage', detectSemanticCoverage, {
            domain: 'sem', version: '1.0.0', description: 'Detects code patterns not reflected in semantic metadata'
        });

        // 2.9 Semantic Persistence
        const { detectSemanticPersistence } = await import('./semantic-persistence-guard.js');
        registry.registerImpactGuard('semantic-persistence', detectSemanticPersistence, {
            domain: 'sem', version: '1.0.0', description: 'Detects atoms whose semantic compiler metadata was dropped during persistence'
        });

        // 2.10 Runtime Registry Health
        const { detectRuntimeRegistryHealth } = await import('./runtime-registry-health-guard.js');
        registry.registerImpactGuard('runtime-registry-health', detectRuntimeRegistryHealth, {
            domain: 'runtime', version: '1.0.0', description: 'Detects idempotency issues, churn, and leaks in runtime registries'
        });

        // 2.11 Conceptual Duplicate Risk
        const { detectConceptualDuplicateRisk } = await import('./conceptual-duplicate-risk.js');
        registry.registerImpactGuard('conceptual-duplicate-risk', detectConceptualDuplicateRisk, {
            domain: 'code', version: '1.0.0', description: 'Detects mirror atoms - functions with same semantic purpose but different implementations'
        });

        // 2.12 Unified Duplicate Risk (Structural + Conceptual Coordinator)
        const { detectUnifiedDuplicateRisk } = await import('./unified-duplicate-guard.js');
        registry.registerImpactGuard('unified-duplicate-risk', detectUnifiedDuplicateRisk, {
            domain: 'code', version: '1.0.0', description: 'Unified coordinator for structural (DNA) and conceptual (semantic) duplicate detection'
        });
    } catch (error) {
        throw new Error(`Failed to register default impact guards: ${error.message}`);
    }
}
