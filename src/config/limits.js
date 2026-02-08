/**
 * @fileoverview limits.js
 * 
 * SSOT - All limits, thresholds, and timeouts
 * Centralizes magic numbers to make them configurable
 * 
 * @module config/limits
 */

/**
 * Batch processing limits
 * @constant {Object}
 */
export const BATCH = {
  /** Files per batch */
  SIZE: 10,
  /** Maximum batches to keep in memory */
  MAX_QUEUED: 50,
  /** Timeout before processing incomplete batch (ms) */
  TIMEOUT_MS: 1000,
  /** Maximum concurrent batch processors */
  MAX_CONCURRENT: 5,
  /** Maximum retry attempts for failed batches */
  MAX_RETRIES: 3
};

/**
 * Analysis limits
 * @constant {Object}
 */
export const ANALYSIS = {
  /** Maximum concurrent analyses */
  MAX_CONCURRENT: 4,
  /** Timeout for single file analysis (ms) */
  TIMEOUT_MS: 30000,
  /** Delay between polling checks (ms) */
  POLL_INTERVAL_MS: 1000,
  /** Files to process in parallel per batch */
  PARALLEL_FILES: 10
};

/**
 * LLM-related limits
 * @constant {Object}
 */
export const LLM = {
  /** Timeout for LLM request (ms) */
  TIMEOUT_MS: 60000,
  /** Maximum retries for failed LLM calls */
  MAX_RETRIES: 2,
  /** Delay between retries (ms) */
  RETRY_DELAY_MS: 2000,
  /** Complexity threshold for using LLM (0-1) */
  COMPLEXITY_THRESHOLD: 0.7,
  /** Confidence threshold for accepting LLM results (0-1) */
  CONFIDENCE_THRESHOLD: 0.8
};

/**
 * Cache limits
 * @constant {Object}
 */
export const CACHE = {
  /** Maximum entries in memory cache */
  MAX_ENTRIES: 1000,
  /** TTL for cache entries (ms) */
  TTL_MS: 3600000, // 1 hour
  /** Cleanup interval (ms) */
  CLEANUP_INTERVAL_MS: 300000 // 5 minutes
};

/**
 * File watcher limits
 * @constant {Object}
 */
export const WATCHER = {
  /** Delay before processing file changes (ms) */
  BATCH_DELAY_MS: 500,
  /** Maximum files to watch */
  MAX_FILES: 10000,
  /** Poll interval for fallback (ms) */
  POLL_INTERVAL_MS: 1000
};

/**
 * Connection detection limits
 * @constant {Object}
 */
export const CONNECTIONS = {
  /** Maximum depth for transitive dependency search */
  MAX_DEPTH: 5,
  /** Minimum confidence to report a connection (0-1) */
  MIN_CONFIDENCE: 0.5,
  /** Maximum connections per file to store */
  MAX_PER_FILE: 100
};

/**
 * Architectural pattern thresholds
 * @constant {Object}
 */
export const ARCHITECTURAL = {
  /** God Object detection thresholds */
  GOD_OBJECT: {
    MIN_EXPORTS: 5,
    MIN_DEPENDENTS: 10,
    HIGH_DEPENDENTS: 20,
    COUPLING_RATIO: 3
  },
  /** Orphan Module detection thresholds */
  ORPHAN_MODULE: {
    MAX_DEPENDENTS: 0,
    MIN_EXPORTS: 1
  }
};

/**
 * Retry configuration
 * @constant {Object}
 */
export const RETRY = {
  /** Base delay between retries (ms) */
  BASE_DELAY_MS: 1000,
  /** Maximum delay between retries (ms) */
  MAX_DELAY_MS: 30000,
  /** Exponential backoff multiplier */
  BACKOFF_MULTIPLIER: 2
};

/**
 * Tunnel Vision detection thresholds
 * @constant {Object}
 */
export const TUNNEL_VISION = {
  /** Minimum affected files to trigger tunnel vision warning */
  MIN_AFFECTED_FILES: 3
};

/**
 * Server configuration
 * @constant {Object}
 */
export const SERVER = {
  /** Default orchestrator port */
  ORCHESTRATOR_PORT: 9999,
  /** Default bridge port */
  BRIDGE_PORT: 9998,
  /** Default LLM GPU port */
  LLM_GPU_PORT: 8000,
  /** Default LLM CPU port */
  LLM_CPU_PORT: 8001,
  /** Shutdown timeout (ms) */
  SHUTDOWN_TIMEOUT_MS: 5000
};
