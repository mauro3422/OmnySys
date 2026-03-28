import { defineVersionedLazyGuard } from './guard-definition-factory.js';

export const impactGuardDefinitionsSemantic = [
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
    () => import('./runtime-registry-health/guard.js'),
    (mod) => mod.detectRuntimeRegistryHealth,
    'runtime',
    '1.0.0',
    'Detects idempotency issues, churn, and leaks in runtime registries'
  ),
  defineVersionedLazyGuard(
    'conceptual-duplicate-risk',
    () => import('./conceptual-duplicate-risk/index.js'),
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
