export function emitConceptualDuplicateFinding(eventEmitterContext, normalizedFilePath, severity, findings, propagation = null) {
    eventEmitterContext.emit('code:conceptual_duplicate', {
        filePath: normalizedFilePath,
        severity,
        duplicateCount: findings.length,
        propagation,
        findings: findings.map((finding) => ({
            symbol: finding.symbol,
            semanticFingerprint: finding.semanticFingerprint,
            instances: finding.totalInstances,
            files: finding.duplicateFiles.length
        }))
    });
}
