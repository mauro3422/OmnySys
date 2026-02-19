/**
 * @fileoverview change-types.js
 * 
 * SSOT - Single definition for all change types
 * Resolves duplication between batch-processor and cache-manager
 * 
 * @module config/change-types
 */

/**
 * File change types (creation, modification, deletion)
 * Used by batch processor and file watcher
 * @readonly
 * @enum {string}
 */
export const FileChangeType = {
  CREATED: 'created',
  MODIFIED: 'modified',
  DELETED: 'deleted'
};

/**
 * Semantic change types (impact levels)
 * Used by cache manager and impact analyzer
 * @readonly
 * @enum {string}
 */
export const SemanticChangeType = {
  NONE: 'none',
  COSMETIC: 'cosmetic',      // Formatting, comments
  STATIC: 'static',          // Internal implementation
  SEMANTIC: 'semantic',      // Affects dependencies
  CRITICAL: 'critical'       // Breaking changes
};

/**
 * Priority levels for processing
 * @readonly
 * @enum {number}
 */
export const Priority = {
  CRITICAL: 4,  // God objects, files with many dependents
  HIGH: 3,      // Exports changed (potential breaking)
  MEDIUM: 2,    // Imports changed
  LOW: 1        // Internal changes only
};

/**
 * Batch states
 * @readonly
 * @enum {string}
 */
export const BatchState = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Analysis states
 * @readonly
 * @enum {string}
 */
export const AnalysisState = {
  PENDING: 'pending',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

/**
 * Connection types
 * @readonly
 * @enum {string}
 */
export const ConnectionType = {
  IMPORT: 'import',
  EXPORT: 'export',
  EVENT: 'event',
  STATE: 'state',
  GLOBAL: 'global',
  CALLBACK: 'callback',
  DYNAMIC: 'dynamic'
};

/**
 * Archetype types
 * @readonly
 * @enum {string}
 */
export const ArchetypeType = {
  GOD_OBJECT: 'god-object',
  ORPHAN_MODULE: 'orphan-module',
  DYNAMIC_IMPORTER: 'dynamic-importer',
  STATE_MANAGER: 'state-manager',
  EVENT_HUB: 'event-hub',
  SINGLETON: 'singleton'
};

