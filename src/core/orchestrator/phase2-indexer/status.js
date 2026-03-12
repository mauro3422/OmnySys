export function buildPhase2Status({ totalFiles, pendingFiles, completed, startedAt }) {
    const processedFiles = Math.max(0, totalFiles - pendingFiles);
    const elapsedMs = startedAt ? Date.now() - startedAt : 0;
    const rate = elapsedMs > 0 ? processedFiles / (elapsedMs / 1000) : 0;
    const percent = totalFiles > 0 ? Number(((processedFiles / totalFiles) * 100).toFixed(1)) : 100;
    const etaMs = !completed && rate > 0 ? Math.round((pendingFiles / rate) * 1000) : 0;

    return {
        inProgress: !completed && pendingFiles > 0,
        completed,
        totalFiles,
        processedFiles,
        pendingFiles,
        completedFiles: processedFiles,
        percentComplete: percent,
        rateItemsPerSecond: Number(rate.toFixed(1)),
        etaMs,
        startedAt: startedAt ? new Date(startedAt).toISOString() : null,
        lastUpdatedAt: new Date().toISOString()
    };
}
