import { defineVersionedLazyGuard } from './guard-definition-factory.js';

export const semanticGuardDefinitions = [
  defineVersionedLazyGuard(
    'shared-state',
    () => import('./shared-state-guard.js'),
    (mod) => mod.detectSharedStateContention,
    'sem',
    '2.0.0',
    'Detects excessive shared state contention (radioactive atoms)'
  ),
  defineVersionedLazyGuard(
    'atomic-integrity',
    () => import('./integrity-guard.js'),
    (mod) => mod.detectIntegrityViolations,
    'sem',
    '2.0.0',
    'Validates data-flow coherence and detects unused inputs'
  ),
  defineVersionedLazyGuard(
    'async-safety',
    () => import('./async-safety-guard.js'),
    (mod) => mod.detectAsyncSafetyIssues,
    'runtime',
    '1.0.0',
    'Detects async functions without proper error handling'
  ),
  defineVersionedLazyGuard(
    'metadata-completeness',
    () => import('./metadata-completeness-guard.js'),
    (mod) => mod.detectMetadataCompleteness,
    'code',
    '1.0.0',
    'Detects production atoms missing derived compiler metadata'
  ),
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
    () => import('./event-leak-guard.js'),
    (mod) => mod.detectEventLeaks,
    'runtime',
    '1.0.0',
    'Detects potential event listener memory leaks'
  ),
  defineVersionedLazyGuard(
    'dead-code',
    () => import('./dead-code-guard.js'),
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
  )
];
