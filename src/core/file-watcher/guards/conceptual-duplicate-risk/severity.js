export function buildConceptualSeverity(findings) {
    const chests = findings.map((finding) => finding.semanticFingerprint.split(':')[1] || 'logic');
    const hasPublicApiIssue = findings.some((finding) => finding.isExported && finding.existingExports > 0);

    if (chests.includes('logic') || chests.includes('orchestration')) {
        return hasPublicApiIssue ? 'high' : 'medium';
    }

    if (chests.every((chest) => chest === 'lifecycle')) {
        return 'low';
    }

    if (chests.includes('telemetry') || chests.includes('storage')) {
        return 'medium';
    }

    return 'medium';
}
