export function createStandardContext({
    guardName,
    atomId = null,
    atomName = null,
    metricValue = null,
    threshold = null,
    severity = null,
    suggestedAction,
    suggestedAlternatives = [],
    relatedAtomIds = [],
    relatedFiles = [],
    extraData = {}
} = {}) {
    return {
        source: 'file_watcher',
        guardName,
        timestamp: new Date().toISOString(),
        ...(atomId && { atomId }),
        ...(atomName && { atomName }),
        ...(metricValue !== null && { metricValue }),
        ...(threshold !== null && { threshold }),
        ...(severity && { severity }),
        suggestedAction,
        ...(suggestedAlternatives.length > 0 && { suggestedAlternatives }),
        ...(relatedAtomIds.length > 0 && { relatedAtomIds }),
        ...(relatedFiles.length > 0 && { relatedFiles }),
        ...extraData
    };
}
