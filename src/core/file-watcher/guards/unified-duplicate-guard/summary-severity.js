export function resolveUnifiedDuplicateSeverity(coordinated, allFindings) {
    let severity = 'medium';
    let issueTypeLabel = 'duplicate_unified';

    if (coordinated.hasOverlap) {
        severity = 'high';
        issueTypeLabel = 'duplicate_unified_critical';
    } else if (coordinated.structural.length >= 3 || allFindings.length >= 5) {
        severity = 'high';
    }

    return { severity, issueTypeLabel };
}
