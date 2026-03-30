import { defineVersionedLazyGuard } from './guard-definition-factory.js';

export const semanticGuardDefinitionsCore = [
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
    () => import('./integrity-guard/guard.js'),
    (mod) => mod.detectIntegrityViolations,
    'sem',
    '2.0.0',
    'Validates data-flow coherence and detects unused inputs'
  ),
  defineVersionedLazyGuard(
    'async-safety',
    () => import('./async-safety/guard.js'),
    (mod) => mod.detectAsyncSafetyIssues,
    'runtime',
    '1.0.0',
    'Detects async functions without proper error handling'
  ),
  defineVersionedLazyGuard(
    'metadata-completeness',
    () => import('./metadata-completeness/index.js'),
    (mod) => mod.detectMetadataCompleteness,
    'code',
    '1.0.0',
    'Detects production atoms missing derived compiler metadata'
  )
];
