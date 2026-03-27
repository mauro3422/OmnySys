import { defineVersionedLazyGuard } from './guard-definition-factory.js';

export const impactGuardDefinitionsRuntime = [
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
  )
];
