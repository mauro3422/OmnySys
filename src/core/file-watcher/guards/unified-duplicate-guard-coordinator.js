import { executeUnifiedDuplicateRisk } from './unified-duplicate-guard-execution.js';

export async function coordinateUnifiedDuplicateRisk({
    rootPath,
    normalizedFilePath,
    repo,
    providedAtoms,
    maxFindings,
    minLinesOfCode,
    enableStructural,
    enableConceptual,
    logger
}) {
    return executeUnifiedDuplicateRisk({
        rootPath,
        normalizedFilePath,
        repo,
        providedAtoms,
        maxFindings,
        minLinesOfCode,
        enableStructural,
        enableConceptual,
        logger
    });
}
