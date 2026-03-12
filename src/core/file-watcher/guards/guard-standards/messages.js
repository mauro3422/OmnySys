export function formatDuplicateMessage(count, preview) {
    return `${count} duplicate symbol${count > 1 ? 's' : ''} detected: ${preview}`;
}

export function formatImpactMessage(level, score, relatedFiles) {
    return `Impact wave ${level} (score=${score}, ${relatedFiles} related file${relatedFiles !== 1 ? 's' : ''})`;
}

export function formatAsyncSafetyMessage(functionName, reason) {
    return `Async function '${functionName}' ${reason}`;
}

export function formatEventLeakMessage(functionName, listenerCount) {
    return `Potential event leak in '${functionName}' (${listenerCount} listeners without cleanup)`;
}
