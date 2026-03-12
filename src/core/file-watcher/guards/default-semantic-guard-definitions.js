function semanticGuard(name, loadGuard, metadata) {
  return { name, loadGuard, metadata };
}

async function loadSemanticGuard(moduleLoader, selector) {
  try {
    const mod = await moduleLoader();
    return selector(mod);
  } catch (error) {
    throw new Error(`Failed to load semantic guard: ${error.message}`);
  }
}

export const semanticGuardDefinitions = [
  semanticGuard(
    'shared-state',
    async () => loadSemanticGuard(() => import('./shared-state-guard.js'), (mod) => mod.detectSharedStateContention),
    { domain: 'sem', version: '2.0.0', description: 'Detects excessive shared state contention (radioactive atoms)' }
  ),
  semanticGuard(
    'atomic-integrity',
    async () => loadSemanticGuard(() => import('./integrity-guard.js'), (mod) => mod.detectIntegrityViolations),
    { domain: 'sem', version: '2.0.0', description: 'Validates data-flow coherence and detects unused inputs' }
  ),
  semanticGuard(
    'async-safety',
    async () => loadSemanticGuard(() => import('./async-safety-guard.js'), (mod) => mod.detectAsyncSafetyIssues),
    { domain: 'runtime', version: '1.0.0', description: 'Detects async functions without proper error handling' }
  ),
  semanticGuard(
    'metadata-completeness',
    async () => loadSemanticGuard(() => import('./metadata-completeness-guard.js'), (mod) => mod.detectMetadataCompleteness),
    { domain: 'code', version: '1.0.0', description: 'Detects production atoms missing derived compiler metadata' }
  ),
  semanticGuard(
    'compiler-policy-conformance',
    async () => loadSemanticGuard(() => import('./compiler-policy-conformance-guard.js'), (mod) => mod.detectCompilerPolicyConformance),
    { domain: 'arch', version: '1.0.0', description: 'Detects ad-hoc compiler policy implementations instead of canonical shared APIs' }
  ),
  semanticGuard(
    'complexity-monitor',
    async () => loadSemanticGuard(() => import('./complexity-guard.js'), (mod) => mod.detectHighComplexity),
    { domain: 'code', version: '1.0.0', description: 'Monitors cyclomatic complexity and function length' }
  ),
  semanticGuard(
    'event-leak',
    async () => loadSemanticGuard(() => import('./event-leak-guard.js'), (mod) => mod.detectEventLeaks),
    { domain: 'runtime', version: '1.0.0', description: 'Detects potential event listener memory leaks' }
  ),
  semanticGuard(
    'dead-code',
    async () => loadSemanticGuard(() => import('./dead-code-guard.js'), (mod) => mod.detectDeadCode),
    { domain: 'code', version: '1.0.0', description: 'Alerts on newly created dead code' }
  ),
  semanticGuard(
    'file-size-monitor',
    async () => loadSemanticGuard(() => import('./governance/file-size-guard.js'), (mod) => mod.detectFileSizeLimits),
    { domain: 'code', version: '1.0.0', description: 'Monitors total file length to prevent gigantic files that break AI context ceilings' }
  ),
  semanticGuard(
    'canonical-dependency-monitor',
    async () => loadSemanticGuard(() => import('./governance/canonical-dependency-guard.js'), (mod) => mod.detectCanonicalDependencies),
    { domain: 'arch', version: '1.0.0', description: 'Detects abstractions that bypass canonical APIs and read raw tables' }
  ),
  semanticGuard(
    'advisory-inference-monitor',
    async () => loadSemanticGuard(() => import('./governance/advisory-inference-guard.js'), (mod) => mod.detectAdvisoryInferences),
    { domain: 'arch', version: '1.0.0', description: 'Detects trust in advisory surfaces without validating their integrity metadata first' }
  )
];
