/**
 * @fileoverview integrity-contract.js
 *
 * Contrato canónico para recomendaciones del dashboard y detector de integridad.
 *
 * @module core/meta-detector/integrity-contract
 */

const DEFAULT_RECOMMENDATION = {
    action: 'Review pipeline integrity findings and reconcile canonical metrics',
    reason: 'The integrity detector reported a failing check without a specialized recommendation',
    impact: 'medium',
    estimatedEffort: '1-2 hours',
    summary: 'Review pipeline integrity findings and reconcile canonical metrics'
};

function asCount(value) {
    return Number.isFinite(value) ? value : 0;
}

const RECOMMENDATION_BUILDERS = {
    scan_to_atom_coverage: ({ details = {} }) => {
        const zeroAtomFiles = asCount(details.zeroAtomFiles);
        const missingFiles = asCount(details.missingFiles);
        const affected = zeroAtomFiles + missingFiles;
        return {
            action: 'Re-run extraction for files missing live atom coverage',
            reason: `${affected} scanned file(s) are not represented in the live atom index`,
            impact: 'high',
            estimatedEffort: affected > 100 ? '2-4 hours' : '30-60 minutes',
            summary: 'Scanner, manifest and live atom index are out of sync; re-run extraction and verify file coverage'
        };
    },
    atom_metadata_completeness: ({ details = {} }) => {
        const missingRequired = asCount(details.missingRequired);
        return {
            action: 'Repair required atom metadata during Layer A extraction',
            reason: `${missingRequired} atom(s) are missing required metadata fields`,
            impact: missingRequired > 50 ? 'high' : 'medium',
            estimatedEffort: missingRequired > 100 ? '2-4 hours' : '1-2 hours',
            summary: 'Repair Layer A extraction so all live atoms persist required metadata fields'
        };
    },
    calledBy_resolution: ({ details = {} }) => {
        const unresolvedLinks = asCount(details.unresolvedLinks);
        return {
            action: 'Rebuild unresolved calledBy links from canonical relation data',
            reason: `${unresolvedLinks} calledBy link(s) remain unresolved`,
            impact: unresolvedLinks > 500 ? 'high' : 'medium',
            estimatedEffort: unresolvedLinks > 500 ? '2-4 hours' : '1 hour',
            summary: 'Rebuild unresolved calledBy links so cross-file dependency navigation stays canonical'
        };
    },
    guard_execution: ({ details = {} }) => {
        const missingGuards = Array.isArray(details.missingGuards) ? details.missingGuards : [];
        return {
            action: 'Restore missing guard registrations before continuing analysis',
            reason: `Guard registry is missing ${missingGuards.length} expected guard bucket(s)`,
            impact: 'high',
            estimatedEffort: '30-90 minutes',
            summary: 'Restore missing guard registrations so watcher findings remain trustworthy'
        };
    },
    issue_persistence: ({ details = {} }) => {
        const orphanedIssues = asCount(details.orphanedIssues);
        const withoutLifecycle = asCount(details.withoutLifecycle);
        return {
            action: 'Observe lifecycle reconciliation status; no manual cleanup should be required',
            reason: `${orphanedIssues} orphaned issue(s) and ${withoutLifecycle} issue(s) without lifecycle metadata remain active`,
            impact: orphanedIssues > 100 ? 'high' : 'low',
            estimatedEffort: 'No manual action expected',
            summary: 'Issue persistence is drifting; lifecycle reconciliation should self-heal orphaned issues and restore lifecycle metadata'
        };
    },
    mcp_data_access: ({ details = {} }) => {
        const failedTools = Array.isArray(details.failedTools) ? details.failedTools : [];
        return {
            action: 'Repair MCP data access against the canonical SQLite repository',
            reason: `${failedTools.length} MCP tool(s) cannot read canonical analysis data`,
            impact: 'high',
            estimatedEffort: '30-90 minutes',
            summary: 'Repair MCP access to canonical analysis tables before trusting tool output'
        };
    },
    orphaned_data: ({ details = {} }) => {
        const totalOrphans = asCount(details.totalOrphans);
        return {
            action: 'Use built-in reconciliation to remove orphaned records from canonical tables',
            reason: `${totalOrphans} orphaned row(s) remain in SQLite-derived analysis tables`,
            impact: totalOrphans > 100 ? 'high' : 'medium',
            estimatedEffort: 'System-managed reconciliation',
            summary: 'Canonical tables still contain orphaned rows; use built-in reconciliation instead of manual cleanup scripts'
        };
    },
    relation_consistency: ({ details = {} }) => {
        const inconsistencies = asCount(details.inconsistencies);
        return {
            action: 'Reconcile inconsistent relations from canonical atom linkage data',
            reason: `${inconsistencies} sampled relation(s) are inconsistent or point to missing atoms`,
            impact: inconsistencies > 50 ? 'high' : 'medium',
            estimatedEffort: '1-2 hours',
            summary: 'Reconcile inconsistent relation edges so graph-derived metrics remain trustworthy'
        };
    }
};

export function buildIntegrityRecommendation(result = {}) {
    const builder = RECOMMENDATION_BUILDERS[result.name];
    if (!builder) {
        return DEFAULT_RECOMMENDATION;
    }

    return builder(result);
}

export default buildIntegrityRecommendation;
