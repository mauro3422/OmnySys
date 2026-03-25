import { defineGuard, defineLazyGuard, defineVersionedLazyGuard, loadGuardMember } from './guard-definition-factory.js';

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
  defineVersionedLazyGuard(
    'duplicate-risk',
    () => import('./duplicate-risk.js'),
    (mod) => mod.detectDuplicateRisk,
    'code',
    '2.0.0',
    'Detects duplicate symbols by DNA hash'
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
  defineVersionedLazyGuard(
    'hotspot-detector',
    () => import('./hotspot-guard.js'),
    (mod) => mod.detectHotspots,
    'perf',
    '1.0.0',
    'Detects frequently changing code (hotspots)'
  ),
  defineVersionedLazyGuard(
    'pipeline-health',
    () => import('./pipeline-health-guard.js'),
    (mod) => mod.detectPipelineIssues,
    'code',
    '1.0.0',
    'Monitors pipeline health (shadow volume, zero atoms)'
  ),
  defineVersionedLazyGuard(
    'topology-regression',
    () => import('./topology-regression-guard.js'),
    (mod) => mod.detectTopologyRegression,
    'arch',
    '1.0.0',
    'Detects sudden loss of topology signal after a file change'
  ),
  defineVersionedLazyGuard(
    'pipeline-orphan',
    () => import('./pipeline-orphan-guard.js'),
    (mod) => mod.detectPipelineOrphans,
    'arch',
    '1.0.0',
    'Detects exported pipeline atoms that became disconnected after a change'
  ),
  defineVersionedLazyGuard(
    'semantic-coverage',
    () => import('./semantic-coverage-guard.js'),
    (mod) => mod.detectSemanticCoverage,
    'sem',
    '1.0.0',
    'Detects code patterns not reflected in semantic metadata'
  ),
  defineVersionedLazyGuard(
    'semantic-persistence',
    () => import('./semantic-persistence-guard.js'),
    (mod) => mod.detectSemanticPersistence,
    'sem',
    '1.0.0',
    'Detects atoms whose semantic compiler metadata was dropped during persistence'
  ),
  defineVersionedLazyGuard(
    'runtime-registry-health',
    () => import('./runtime-registry-health-guard.js'),
    (mod) => mod.detectRuntimeRegistryHealth,
    'runtime',
    '1.0.0',
    'Detects idempotency issues, churn, and leaks in runtime registries'
  ),
  defineVersionedLazyGuard(
    'conceptual-duplicate-risk',
    () => import('./conceptual-duplicate-risk.js'),
    (mod) => mod.detectConceptualDuplicateRisk,
    'code',
    '1.0.0',
    'Detects mirror atoms - functions with same semantic purpose but different implementations'
  ),
  defineVersionedLazyGuard(
    'unified-duplicate-risk',
    () => import('./unified-duplicate-guard.js'),
    (mod) => mod.detectUnifiedDuplicateRisk,
    'code',
    '1.0.0',
    'Unified coordinator for structural (DNA) and conceptual (semantic) duplicate detection'
  )
];
