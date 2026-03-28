/**
 * @fileoverview RecommendationEngine.js
 * 
 * Single Source of Truth for system recommendations.
 * Consolidates architectural, structural, and conceptual guidance.
 * 
 * @module shared/compiler/recommendations/RecommendationEngine
 */

import { resolveArchitecturalRecommendation } from '../architectural-recommendations.js';

/**
 * Canonical recommendation templates for non-architectural issues.
 */
const CANONICAL_TEMPLATES = {
    file_in_wrong_directory: (ctx) => ({
        message: `Move to ${ctx.expectedDirectory}`,
        action: 'Relocate file to maintain structural conformance',
        strategy: 'directory_alignment'
    }),
    flat_family_sprawl: (ctx) => ({
        message: `Folderize ${ctx.familyRoot} into a dedicated subdirectory under ${ctx.directory} and keep a barrel/index entrypoint.`,
        action: 'Group related helpers into a dedicated folder with a thin barrel',
        strategy: 'folderization'
    }),
    high_coupling: () => ({
        message: 'Consider splitting into smaller modules or using dependency injection',
        action: 'Reduce import count to improve modularity',
        strategy: 'decoupling'
    }),
    conceptual_duplicate: (ctx) => ({
        message: `Consolidate ${ctx.instanceCount} duplicate implementations`,
        action: 'Use a single canonical API (SSOT) instead of re-implementing logic',
        strategy: 'logic_consolidation'
    }),
    dead_code: () => ({
        message: 'Use getSuspiciousDeadCodeCount / getDeadCodePlausibilitySummary from shared/compiler instead of rebuilding dead-code heuristics inline.',
        action: 'Purge or rewire suspected dead code',
        strategy: 'code_dead_removal'
    }),
    pipeline_orphan: () => ({
        message: 'Use classifyPipelineOrphans / getPipelineOrphanSummary from shared/compiler instead of rebuilding orphan heuristics inline.',
        action: 'Reconnect or remove orphaned pipeline data',
        strategy: 'pipeline_integrity'
    }),
    live_row_drift: () => ({
        message: 'Use getLiveRowDriftSummary / ensureLiveRowSync from shared/compiler instead of hand-rolling stale row SQL.',
        action: 'Reconcile table data with the live atom graph',
        strategy: 'data_sync'
    }),
    policy_conformance: (ctx) => ({
        message: ctx.message || 'Replace ad-hoc policy logic with the canonical compiler API entrypoint.',
        action: 'Align with compiler architecture policy',
        strategy: 'governance'
    }),
    signal_coverage: () => ({
        message: 'Use the canonical signal coverage APIs for centrality/physics coverage instead of rebuilding coverage heuristics inline.',
        action: 'Unify signal reporting',
        strategy: 'telemetry'
    }),
    shared_state_hotspot: () => ({
        message: 'Read hotspot/shared-state contention through a canonical reporting API instead of hardcoding hot keys inline.',
        action: 'Consolidate hotspot reporting',
        strategy: 'performance'
    }),
    nested_duplicate: () => ({
        message: 'CRITICAL: Same symbol has both structural (DNA) and conceptual (semantic) duplicates. Resolve structural first.',
        action: 'Perform multi-stage consolidation',
        strategy: 'logic_consolidation'
    }),
    dna_cluster: () => ({
        message: 'Consolidate duplicate DNA groups around a canonical implementation before the cluster grows.',
        action: 'Initialize SSOT for DNA cluster',
        strategy: 'logic_consolidation'
    })
};

/**
 * Resolves a canonical recommendation for any given issue.
 * 
 * @param {Object} params - Issue parameters
 * @param {string} params.type - Issue type (e.g. 'high_coupling')
 * @param {string} params.filePath - Path to the problematic file
 * @param {Object} params.context - Issue context (instance counts, expected paths, etc)
 * @returns {Object} { message, action, strategy, alternatives }
 */
export function getRecommendation({ type, filePath, context = {} }) {
    // 1. Try architectural resolution first
    const archRec = resolveArchitecturalRecommendation({
        issueType: type,
        filePath,
        context
    });

    if (archRec) {
        return {
            message: archRec.action,
            action: archRec.action,
            strategy: archRec.strategy,
            alternatives: archRec.alternatives || []
        };
    }

    // 2. Try canonical templates
    const template = CANONICAL_TEMPLATES[type];
    if (template) {
        return template(context);
    }

    // 3. Fallback to generic recommendation
    return {
        message: 'Review issue and consider architectural patterns for refactoring.',
        action: 'General debt remediation',
        strategy: 'manual_review'
    };
}
