import { scanCompilerPolicyDrift, summarizeCompilerPolicyDrift } from '../../../../../shared/compiler/index.js';

export async function scanCompilerPolicyHealth(projectPath) {
    if (!projectPath) {
        return {
            policyFindings: [],
            policySummary: { total: 0, high: 0, medium: 0, byPolicyArea: {}, byRule: {} },
            issues: [],
            warnings: [],
            tableCounts: {}
        };
    }

    try {
        const policyFindings = await scanCompilerPolicyDrift(projectPath, { limit: 100 });
        const policySummary = summarizeCompilerPolicyDrift(policyFindings);
        const issues = [];
        const warnings = [];
        const tableCounts = {
            compiler_policy_areas: Object.keys(policySummary.byPolicyArea || {}).length
        };

        if (policySummary.total > 0) {
            warnings.push({
                field: 'compiler_policy',
                coverage: `${policySummary.total} findings`,
                issue: 'Compiler policy drift detected — some MCP/watcher paths still recompute canonical signals manually'
            });

            if (policySummary.high > 0) {
                issues.push({
                    field: 'compiler_policy_high',
                    coverage: `${policySummary.high} high`,
                    issue: 'High-severity compiler policy drift found in core runtime modules'
                });
            }

            tableCounts.compiler_policy_findings = policySummary.total;
            tableCounts.compiler_policy_high = policySummary.high;
        }

        return { policyFindings, policySummary, issues, warnings, tableCounts };
    } catch (error) {
        return {
            policyFindings: [],
            policySummary: { total: 0, high: 0, medium: 0, byPolicyArea: {}, byRule: {} },
            issues: [],
            warnings: [{
                field: 'compiler_policy',
                coverage: 'unknown',
                issue: `Could not scan compiler policy drift: ${error.message}`
            }],
            tableCounts: {}
        };
    }
}
