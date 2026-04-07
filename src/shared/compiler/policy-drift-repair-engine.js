/**
 * @fileoverview Policy Drift Repair Engine (Barrel)
 *
 * Public API for detecting and repairing policy drifts.
 *
 * @module shared/compiler/policy-drift-repair-engine
 */

export { FIX_TEMPLATES, classifyDrift } from './policy-drift-templates.js';
export { detectPolicyDrifts, detectPolicyDriftsBatch, detectPolicyDriftsInDirectory } from './policy-drift-scanner.js';
export { generateRepairPlan, generateRepairPlansBatch, executeRepairPlan, consolidatePolicyDrifts } from './policy-drift-repairer.js';
