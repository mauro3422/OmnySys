export function emitUnifiedDuplicateFinding(eventEmitterContext, normalizedFilePath, payload, allFindings) {
    eventEmitterContext.emit('code:duplicate_unified', {
        filePath: normalizedFilePath,
        severity: payload.severity,
        totalDuplicateCount: payload.totalDuplicateCount,
        structuralCount: payload.structuralCount,
        conceptualCount: payload.conceptualCount,
        hasOverlap: payload.hasOverlap,
        debtScore: payload.debtScore,
        debtTrend: payload.debtTrend,
        findings: allFindings.map((finding) => ({
            symbol: finding.symbol,
            type: finding.duplicateType,
            instances: finding.totalInstances,
            files: finding.duplicateFiles.length
        }))
    });
}
