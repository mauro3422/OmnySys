import { defineGuard, loadGuardMember } from './guard-definition-factory.js';

export const impactGuardDefinitions = [
  defineGuard(
    'impact-wave',
    async () => {
      const detectImpactWave = await loadGuardMember(
        () => import('./impact-wave.js'),
        (mod) => mod.detectImpactWave
      );
      return async (rootPath, filePath, context, options) => {
        const previousAtoms = options.previousAtoms || [];
        return detectImpactWave(rootPath, filePath, previousAtoms, context, async (fp) => context.getAtomsForFile(fp), options);
      };
    },
    { domain: 'arch', version: '2.0.0', description: 'Analyzes blast radius of changes (impact wave)' }
  ),
  defineGuard(
    'duplicate-risk',
    async () => loadGuardMember(() => import('./duplicate-risk.js'), (mod) => mod.detectDuplicateRisk),
    { domain: 'code', version: '2.0.0', description: 'Detects duplicate symbols by DNA hash' }
  ),
  defineGuard(
    'circular-dependencies',
    async () => {
      const detectCircularDependencies = await loadGuardMember(
        () => import('./circular-guard.js'),
        (mod) => mod.detectCircularDependencies
      );
      return async (rootPath, filePath) => {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        return detectCircularDependencies(rootPath, filePath, getRepository(rootPath));
      };
    },
    { domain: 'arch', version: '2.0.0', description: 'Detects circular import and call dependencies' }
  ),
  defineGuard(
    'hotspot-detector',
    async () => loadGuardMember(() => import('./hotspot-guard.js'), (mod) => mod.detectHotspots),
    { domain: 'perf', version: '1.0.0', description: 'Detects frequently changing code (hotspots)' }
  ),
  defineGuard(
    'pipeline-health',
    async () => loadGuardMember(() => import('./pipeline-health-guard.js'), (mod) => mod.detectPipelineIssues),
    { domain: 'code', version: '1.0.0', description: 'Monitors pipeline health (shadow volume, zero atoms)' }
  ),
  defineGuard(
    'topology-regression',
    async () => loadGuardMember(() => import('./topology-regression-guard.js'), (mod) => mod.detectTopologyRegression),
    { domain: 'arch', version: '1.0.0', description: 'Detects sudden loss of topology signal after a file change' }
  ),
  defineGuard(
    'pipeline-orphan',
    async () => loadGuardMember(() => import('./pipeline-orphan-guard.js'), (mod) => mod.detectPipelineOrphans),
    { domain: 'arch', version: '1.0.0', description: 'Detects exported pipeline atoms that became disconnected after a change' }
  ),
  defineGuard(
    'semantic-coverage',
    async () => loadGuardMember(() => import('./semantic-coverage-guard.js'), (mod) => mod.detectSemanticCoverage),
    { domain: 'sem', version: '1.0.0', description: 'Detects code patterns not reflected in semantic metadata' }
  ),
  defineGuard(
    'semantic-persistence',
    async () => loadGuardMember(() => import('./semantic-persistence-guard.js'), (mod) => mod.detectSemanticPersistence),
    { domain: 'sem', version: '1.0.0', description: 'Detects atoms whose semantic compiler metadata was dropped during persistence' }
  ),
  defineGuard(
    'runtime-registry-health',
    async () => loadGuardMember(() => import('./runtime-registry-health-guard.js'), (mod) => mod.detectRuntimeRegistryHealth),
    { domain: 'runtime', version: '1.0.0', description: 'Detects idempotency issues, churn, and leaks in runtime registries' }
  ),
  defineGuard(
    'conceptual-duplicate-risk',
    async () => loadGuardMember(() => import('./conceptual-duplicate-risk.js'), (mod) => mod.detectConceptualDuplicateRisk),
    { domain: 'code', version: '1.0.0', description: 'Detects mirror atoms - functions with same semantic purpose but different implementations' }
  ),
  defineGuard(
    'unified-duplicate-risk',
    async () => loadGuardMember(() => import('./unified-duplicate-guard.js'), (mod) => mod.detectUnifiedDuplicateRisk),
    { domain: 'code', version: '1.0.0', description: 'Unified coordinator for structural (DNA) and conceptual (semantic) duplicate detection' }
  )
];
