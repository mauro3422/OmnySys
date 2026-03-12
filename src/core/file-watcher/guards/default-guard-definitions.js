function semanticGuard(name, loadGuard, metadata) {
  return { name, loadGuard, metadata };
}

function impactGuard(name, loadGuard, metadata) {
  return { name, loadGuard, metadata };
}

export const semanticGuardDefinitions = [
  semanticGuard(
    'shared-state',
    async () => (await import('./shared-state-guard.js')).detectSharedStateContention,
    { domain: 'sem', version: '2.0.0', description: 'Detects excessive shared state contention (radioactive atoms)' }
  ),
  semanticGuard(
    'atomic-integrity',
    async () => (await import('./integrity-guard.js')).detectIntegrityViolations,
    { domain: 'sem', version: '2.0.0', description: 'Validates data-flow coherence and detects unused inputs' }
  ),
  semanticGuard(
    'async-safety',
    async () => (await import('./async-safety-guard.js')).detectAsyncSafetyIssues,
    { domain: 'runtime', version: '1.0.0', description: 'Detects async functions without proper error handling' }
  ),
  semanticGuard(
    'metadata-completeness',
    async () => (await import('./metadata-completeness-guard.js')).detectMetadataCompleteness,
    { domain: 'code', version: '1.0.0', description: 'Detects production atoms missing derived compiler metadata' }
  ),
  semanticGuard(
    'compiler-policy-conformance',
    async () => (await import('./compiler-policy-conformance-guard.js')).detectCompilerPolicyConformance,
    { domain: 'arch', version: '1.0.0', description: 'Detects ad-hoc compiler policy implementations instead of canonical shared APIs' }
  ),
  semanticGuard(
    'complexity-monitor',
    async () => (await import('./complexity-guard.js')).detectHighComplexity,
    { domain: 'code', version: '1.0.0', description: 'Monitors cyclomatic complexity and function length' }
  ),
  semanticGuard(
    'event-leak',
    async () => (await import('./event-leak-guard.js')).detectEventLeaks,
    { domain: 'runtime', version: '1.0.0', description: 'Detects potential event listener memory leaks' }
  ),
  semanticGuard(
    'dead-code',
    async () => (await import('./dead-code-guard.js')).detectDeadCode,
    { domain: 'code', version: '1.0.0', description: 'Alerts on newly created dead code' }
  ),
  semanticGuard(
    'file-size-monitor',
    async () => (await import('./governance/file-size-guard.js')).detectFileSizeLimits,
    { domain: 'code', version: '1.0.0', description: 'Monitors total file length to prevent gigantic files that break AI context ceilings' }
  ),
  semanticGuard(
    'canonical-dependency-monitor',
    async () => (await import('./governance/canonical-dependency-guard.js')).detectCanonicalDependencies,
    { domain: 'arch', version: '1.0.0', description: 'Detects abstractions that bypass canonical APIs and read raw tables' }
  ),
  semanticGuard(
    'advisory-inference-monitor',
    async () => (await import('./governance/advisory-inference-guard.js')).detectAdvisoryInferences,
    { domain: 'arch', version: '1.0.0', description: 'Detects trust in advisory surfaces without validating their integrity metadata first' }
  )
];

export const impactGuardDefinitions = [
  impactGuard(
    'impact-wave',
    async () => {
      const { detectImpactWave } = await import('./impact-wave.js');
      return async (rootPath, filePath, context, options) => {
        const previousAtoms = options.previousAtoms || [];
        return detectImpactWave(rootPath, filePath, previousAtoms, context, async (fp) => context.getAtomsForFile(fp), options);
      };
    },
    { domain: 'arch', version: '2.0.0', description: 'Analyzes blast radius of changes (impact wave)' }
  ),
  impactGuard(
    'duplicate-risk',
    async () => (await import('./duplicate-risk.js')).detectDuplicateRisk,
    { domain: 'code', version: '2.0.0', description: 'Detects duplicate symbols by DNA hash' }
  ),
  impactGuard(
    'circular-dependencies',
    async () => {
      const { detectCircularDependencies } = await import('./circular-guard.js');
      return async (rootPath, filePath) => {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        return detectCircularDependencies(rootPath, filePath, getRepository(rootPath));
      };
    },
    { domain: 'arch', version: '2.0.0', description: 'Detects circular import and call dependencies' }
  ),
  impactGuard(
    'hotspot-detector',
    async () => (await import('./hotspot-guard.js')).detectHotspots,
    { domain: 'perf', version: '1.0.0', description: 'Detects frequently changing code (hotspots)' }
  ),
  impactGuard(
    'pipeline-health',
    async () => (await import('./pipeline-health-guard.js')).detectPipelineIssues,
    { domain: 'code', version: '1.0.0', description: 'Monitors pipeline health (shadow volume, zero atoms)' }
  ),
  impactGuard(
    'topology-regression',
    async () => (await import('./topology-regression-guard.js')).detectTopologyRegression,
    { domain: 'arch', version: '1.0.0', description: 'Detects sudden loss of topology signal after a file change' }
  ),
  impactGuard(
    'pipeline-orphan',
    async () => (await import('./pipeline-orphan-guard.js')).detectPipelineOrphans,
    { domain: 'arch', version: '1.0.0', description: 'Detects exported pipeline atoms that became disconnected after a change' }
  ),
  impactGuard(
    'semantic-coverage',
    async () => (await import('./semantic-coverage-guard.js')).detectSemanticCoverage,
    { domain: 'sem', version: '1.0.0', description: 'Detects code patterns not reflected in semantic metadata' }
  ),
  impactGuard(
    'semantic-persistence',
    async () => (await import('./semantic-persistence-guard.js')).detectSemanticPersistence,
    { domain: 'sem', version: '1.0.0', description: 'Detects atoms whose semantic compiler metadata was dropped during persistence' }
  ),
  impactGuard(
    'runtime-registry-health',
    async () => (await import('./runtime-registry-health-guard.js')).detectRuntimeRegistryHealth,
    { domain: 'runtime', version: '1.0.0', description: 'Detects idempotency issues, churn, and leaks in runtime registries' }
  ),
  impactGuard(
    'conceptual-duplicate-risk',
    async () => (await import('./conceptual-duplicate-risk.js')).detectConceptualDuplicateRisk,
    { domain: 'code', version: '1.0.0', description: 'Detects mirror atoms - functions with same semantic purpose but different implementations' }
  ),
  impactGuard(
    'unified-duplicate-risk',
    async () => (await import('./unified-duplicate-guard.js')).detectUnifiedDuplicateRisk,
    { domain: 'code', version: '1.0.0', description: 'Unified coordinator for structural (DNA) and conceptual (semantic) duplicate detection' }
  )
];
