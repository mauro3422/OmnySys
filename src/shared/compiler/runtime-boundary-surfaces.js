/**
 * @fileoverview Runtime Boundary Surfaces - Canonical API
 *
 * Provides canonical entrypoints for runtime boundary checks, async recovery,
 * and service boundary orchestration. Use these APIs instead of mixing
 * try/catch, network calls, and routing logic inline.
 *
 * @module shared/compiler/runtime-boundary-surfaces
 */

export {
  executeWithBoundary,
  executeWithNetworkBoundary,
  withBoundaryLogging
} from './runtime-boundary/index.js';

export {
  classifyBoundaryError
} from './runtime-boundary-classification.js';

export {
  RecoveryStrategies,
  RuntimeBoundaryMetadata
} from './runtime-boundary-recovery.js';
