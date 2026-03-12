function semanticGuard(name, loadGuard, metadata) {
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
