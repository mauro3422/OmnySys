/**
 * @fileoverview Shared constants for architectural pattern detection.
 *
 * @module shared/compiler/architectural-pattern-detector-constants
 */

export const ARCHITECTURAL_PATTERNS = {
  GOD_OBJECT: 'god_object',
  ORPHAN_MODULE: 'orphan_module',
  THIN_COORDINATOR: 'thin_coordinator',
  HELPER_UTILITY: 'helper_utility',
  POLICY_MODULE: 'policy_module',
  SERVICE_LAYER: 'service_layer',
  CONTROLLER_LAYER: 'controller_layer',
  MODEL_LAYER: 'model_layer'
};
