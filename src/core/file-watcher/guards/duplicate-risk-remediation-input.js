export function buildStructuralRemediationInput(normalizedFilePath, findings) {
    return findings.map((finding) => ({
        groupSize: finding.totalInstances,
        urgencyScore: finding.totalInstances,
        instances: [{
            name: finding.symbol,
            file: normalizedFilePath,
            importanceScore: 0,
            callerCount: 0,
            changeFrequency: 0
        }, ...finding.duplicateFiles.map((duplicateFile) => ({
            name: finding.symbol,
            file: duplicateFile,
            importanceScore: 0,
            callerCount: 0,
            changeFrequency: 0
        }))]
    }));
}
