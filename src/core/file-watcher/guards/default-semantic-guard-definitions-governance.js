import { defineVersionedLazyGuard } from './guard-definition-factory.js';

export const semanticGuardDefinitionsGovernance = [
  defineVersionedLazyGuard(
    'compiler-policy-conformance',
    () => import('./compiler-policy-conformance-guard.js'),
    (mod) => mod.detectCompilerPolicyConformance,
    'arch',
    '1.0.0',
    'Detects ad-hoc compiler policy implementations instead of canonical shared APIs'
  ),
  defineVersionedLazyGuard(
    'complexity-monitor',
    () => import('./complexity-guard.js'),
    (mod) => mod.detectHighComplexity,
    'code',
    '1.0.0',
    'Monitors cyclomatic complexity and function length'
  ),
  defineVersionedLazyGuard(
    'event-leak',
    () => import('./event-leak/index.js'),
    (mod) => mod.detectEventLeaks,
    'runtime',
    '1.0.0',
    'Detects potential event listener memory leaks'
  ),
  defineVersionedLazyGuard(
    'dead-code',
    () => import('./dead-code/guard.js'),
    (mod) => mod.detectDeadCode,
    'code',
    '1.0.0',
    'Alerts on newly created dead code'
  ),
  defineVersionedLazyGuard(
    'file-size-monitor',
    () => import('./governance/file-size-guard.js'),
    (mod) => mod.detectFileSizeLimits,
    'code',
    '1.0.0',
    'Monitors total file length to prevent gigantic files that break AI context ceilings'
  ),
  defineVersionedLazyGuard(
    'canonical-dependency-monitor',
    () => import('./governance/canonical-dependency-guard.js'),
    (mod) => mod.detectCanonicalDependencies,
    'arch',
    '1.0.0',
    'Detects abstractions that bypass canonical APIs and read raw tables'
  ),
  defineVersionedLazyGuard(
    'advisory-inference-monitor',
    () => import('./governance/advisory-inference-guard.js'),
    (mod) => mod.detectAdvisoryInferences,
    'arch',
    '1.0.0',
    'Detects trust in advisory surfaces without validating their integrity metadata first'
  ),
  defineVersionedLazyGuard(
    'semantic-surface-collapse',
    () => import('./semantic-surface-collapse-guard.js'),
    (mod) => mod.detectSemanticSurfaceCollapse,
    'runtime',
    '1.0.0',
    'Detects when semantic_connections drop >50% after reindex, indicating merge/fallback bug in saveSemanticData()'
  ),
  defineVersionedLazyGuard(
    'missing-surface-audit',
    () => import('./missing-surface-audit-guard.js'),
    (mod) => mod.detectMissingSurfaceAudit,
    'arch',
    '1.0.0',
    'Detects DB tables with data but no canonical read surface (Proxy/Bridge/Topology/Sessions show unknown)'
  )
];
