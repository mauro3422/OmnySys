export function emitConceptualDuplicateFinding(eventEmitterContext, normalizedFilePath, severity, findings) {
    eventEmitterContext.emit('code:conceptual_duplicate', {
        filePath: normalizedFilePath,
        severity,
        duplicateCount: findings.length,
        findings: findings.map((finding) => ({
            symbol: finding.symbol,
            semanticFingerprint: finding.semanticFingerprint,
            instances: finding.totalInstances,
            files: finding.duplicateFiles.length
        }))
    });
}
