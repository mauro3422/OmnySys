import { defineGuard, loadGuardMember } from './guard-definition-factory.js';

export const semanticGuardDefinitions = [
  defineGuard(
    'shared-state',
    async () => loadGuardMember(() => import('./shared-state-guard.js'), (mod) => mod.detectSharedStateContention),
    { domain: 'sem', version: '2.0.0', description: 'Detects excessive shared state contention (radioactive atoms)' }
  ),
  defineGuard(
    'atomic-integrity',
    async () => loadGuardMember(() => import('./integrity-guard.js'), (mod) => mod.detectIntegrityViolations),
    { domain: 'sem', version: '2.0.0', description: 'Validates data-flow coherence and detects unused inputs' }
  ),
  defineGuard(
    'async-safety',
    async () => loadGuardMember(() => import('./async-safety-guard.js'), (mod) => mod.detectAsyncSafetyIssues),
    { domain: 'runtime', version: '1.0.0', description: 'Detects async functions without proper error handling' }
  ),
  defineGuard(
    'metadata-completeness',
    async () => loadGuardMember(() => import('./metadata-completeness-guard.js'), (mod) => mod.detectMetadataCompleteness),
    { domain: 'code', version: '1.0.0', description: 'Detects production atoms missing derived compiler metadata' }
  ),
  defineGuard(
    'compiler-policy-conformance',
    async () => loadGuardMember(() => import('./compiler-policy-conformance-guard.js'), (mod) => mod.detectCompilerPolicyConformance),
    { domain: 'arch', version: '1.0.0', description: 'Detects ad-hoc compiler policy implementations instead of canonical shared APIs' }
  ),
  defineGuard(
    'complexity-monitor',
    async () => loadGuardMember(() => import('./complexity-guard.js'), (mod) => mod.detectHighComplexity),
    { domain: 'code', version: '1.0.0', description: 'Monitors cyclomatic complexity and function length' }
  ),
  defineGuard(
    'event-leak',
    async () => loadGuardMember(() => import('./event-leak-guard.js'), (mod) => mod.detectEventLeaks),
    { domain: 'runtime', version: '1.0.0', description: 'Detects potential event listener memory leaks' }
  ),
  defineGuard(
    'dead-code',
    async () => loadGuardMember(() => import('./dead-code-guard.js'), (mod) => mod.detectDeadCode),
    { domain: 'code', version: '1.0.0', description: 'Alerts on newly created dead code' }
  ),
  defineGuard(
    'file-size-monitor',
    async () => loadGuardMember(() => import('./governance/file-size-guard.js'), (mod) => mod.detectFileSizeLimits),
    { domain: 'code', version: '1.0.0', description: 'Monitors total file length to prevent gigantic files that break AI context ceilings' }
  ),
  defineGuard(
    'canonical-dependency-monitor',
    async () => loadGuardMember(() => import('./governance/canonical-dependency-guard.js'), (mod) => mod.detectCanonicalDependencies),
    { domain: 'arch', version: '1.0.0', description: 'Detects abstractions that bypass canonical APIs and read raw tables' }
  ),
  defineGuard(
    'advisory-inference-monitor',
    async () => loadGuardMember(() => import('./governance/advisory-inference-guard.js'), (mod) => mod.detectAdvisoryInferences),
    { domain: 'arch', version: '1.0.0', description: 'Detects trust in advisory surfaces without validating their integrity metadata first' }
  )
];
