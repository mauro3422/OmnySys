import { defineLazyGuard } from './guard-definition-factory.js';

export const semanticGuardDefinitions = [
  defineLazyGuard(
    'shared-state',
    () => import('./shared-state-guard.js'),
    (mod) => mod.detectSharedStateContention,
    { domain: 'sem', version: '2.0.0', description: 'Detects excessive shared state contention (radioactive atoms)' }
  ),
  defineLazyGuard(
    'atomic-integrity',
    () => import('./integrity-guard.js'),
    (mod) => mod.detectIntegrityViolations,
    { domain: 'sem', version: '2.0.0', description: 'Validates data-flow coherence and detects unused inputs' }
  ),
  defineLazyGuard(
    'async-safety',
    () => import('./async-safety-guard.js'),
    (mod) => mod.detectAsyncSafetyIssues,
    { domain: 'runtime', version: '1.0.0', description: 'Detects async functions without proper error handling' }
  ),
  defineLazyGuard(
    'metadata-completeness',
    () => import('./metadata-completeness-guard.js'),
    (mod) => mod.detectMetadataCompleteness,
    { domain: 'code', version: '1.0.0', description: 'Detects production atoms missing derived compiler metadata' }
  ),
  defineLazyGuard(
    'compiler-policy-conformance',
    () => import('./compiler-policy-conformance-guard.js'),
    (mod) => mod.detectCompilerPolicyConformance,
    { domain: 'arch', version: '1.0.0', description: 'Detects ad-hoc compiler policy implementations instead of canonical shared APIs' }
  ),
  defineLazyGuard(
    'complexity-monitor',
    () => import('./complexity-guard.js'),
    (mod) => mod.detectHighComplexity,
    { domain: 'code', version: '1.0.0', description: 'Monitors cyclomatic complexity and function length' }
  ),
  defineLazyGuard(
    'event-leak',
    () => import('./event-leak-guard.js'),
    (mod) => mod.detectEventLeaks,
    { domain: 'runtime', version: '1.0.0', description: 'Detects potential event listener memory leaks' }
  ),
  defineLazyGuard(
    'dead-code',
    () => import('./dead-code-guard.js'),
    (mod) => mod.detectDeadCode,
    { domain: 'code', version: '1.0.0', description: 'Alerts on newly created dead code' }
  ),
  defineLazyGuard(
    'file-size-monitor',
    () => import('./governance/file-size-guard.js'),
    (mod) => mod.detectFileSizeLimits,
    { domain: 'code', version: '1.0.0', description: 'Monitors total file length to prevent gigantic files that break AI context ceilings' }
  ),
  defineLazyGuard(
    'canonical-dependency-monitor',
    () => import('./governance/canonical-dependency-guard.js'),
    (mod) => mod.detectCanonicalDependencies,
    { domain: 'arch', version: '1.0.0', description: 'Detects abstractions that bypass canonical APIs and read raw tables' }
  ),
  defineLazyGuard(
    'advisory-inference-monitor',
    () => import('./governance/advisory-inference-guard.js'),
    (mod) => mod.detectAdvisoryInferences,
    { domain: 'arch', version: '1.0.0', description: 'Detects trust in advisory surfaces without validating their integrity metadata first' }
  )
];
