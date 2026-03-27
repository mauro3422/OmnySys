export function resolveStructuralDuplicateSeverity(findings) {
    return findings.length >= 3 ? 'high' : 'medium';
}
