/**
 * Critical Bottleneck Template
 *
 * For files that are:
 * - Frequently modified (high git churn)
 * - Computationally complex (O(n²) or worse)
 * - Widely depended upon (many imports)
 * - Making many external calls
 *
 * These are the HIGHEST priority refactoring candidates.
 */

export default {
  systemPrompt: `You are analyzing a CRITICAL BOTTLENECK file - a high-priority refactoring candidate.

This file has:
- High git churn (frequently modified)
- High computational complexity (O(n²) or worse)
- Many dependents (widely used)
- Many external calls (complex integrations)

Your task: Provide specific, actionable optimization strategies.`,

  userPrompt: (metadata) => {
    const totalDependents = (metadata.dependentCount || 0) + (metadata.semanticDependentCount || 0);

    return `# Critical Bottleneck Analysis

## File Information
- **Path**: ${metadata.filePath}
- **Complexity**: ${metadata.estimatedComplexity || 'Unknown'}
- **Git Hotspot Score**: ${metadata.gitHotspotScore || 0}
- **Git Churn Rate**: ${metadata.gitChurnRate || 0} commits/month
- **Total Dependents**: ${totalDependents} files
- **External Calls**: ${metadata.externalCallCount || 0}
- **Nested Loops**: ${metadata.hasNestedLoops ? 'Yes' : 'No'}

## Context
${metadata.hasNestedLoops ? '- Contains nested loops that may be O(n²) or worse' : ''}
${metadata.hasBlockingOps ? '- Contains blocking operations that slow execution' : ''}
${metadata.gitChurnRate > 3 ? '- Modified very frequently (high change rate)' : ''}
${totalDependents > 10 ? '- CRITICAL: More than 10 files depend on this' : ''}

## Analysis Required

1. **Optimization Strategy**
   - What are the top 3 optimizations to reduce complexity?
   - Which loops can be flattened, memoized, or parallelized?
   - Can any blocking operations be made async?

2. **Estimated Impact**
   - What performance improvement (%) can be expected?
   - How much will this reduce git churn?
   - Risk of breaking dependents?

3. **Refactoring Risk**
   - High/Medium/Low risk to refactor?
   - Which dependents are most at risk?
   - Recommended testing strategy?

Return ONLY valid JSON matching this schema:
{
  "optimizationStrategy": [
    {"priority": 1, "action": "string", "reasoning": "string"}
  ],
  "estimatedImpact": {
    "performanceGain": "percentage string",
    "maintainabilityGain": "high|medium|low",
    "breakageRisk": "high|medium|low"
  },
  "refactoringRisk": {
    "level": "high|medium|low",
    "atRiskDependents": ["file paths"],
    "testingStrategy": "string"
  }
}`;
  }
};
