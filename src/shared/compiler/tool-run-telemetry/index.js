/**
 * @fileoverview Helper normalizers for tool run telemetry.
 * Barrel module - re-exports all telemetry helpers from their respective modules.
 */

// Snapshot normalizers
export {
  mapSnapshotCurrentForStorage,
  mapSnapshotTrendForStorage,
  compactSnapshotForStorage,
  compactNotificationsForStorage,
  summarizeSnapshotCounts
} from './snapshot-normalizers.js';

// Noise classifier (includes normalizeToolName which is used by other modules)
export {
  normalizeToolName,
  isObservationOnlyTool,
  classifyToolTelemetryNoise,
  buildToolTelemetryNoiseSummary
} from './noise-classifier.js';

// Cache policy
export {
  classifyToolCacheTier,
  buildToolCachePolicySummary
} from './cache-policy.js';

// Repair classifier
export {
  classifyTelemetryRepair
} from './repair-classifier.js';

// Delta computer
export {
  computeTelemetryDeltas
} from './delta-computer.js';

// Persistence
export {
  buildToolRunPersistencePayload,
  buildToolRunPersistenceArgs
} from './persistence.js';

// Re-exported helpers from external modules
export { asNumber, normalizeTelemetryPath } from '../core-utils.js';
export { safeJsonStringify } from '../safe-json.js';
