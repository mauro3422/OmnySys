import { loadUnifiedPreviousFindings, buildUnifiedDebtHistory, coordinateUnifiedDuplicateFindings } from './unified-duplicate-guard-helpers.js';
import { runStructuralDuplicateGuard } from './unified-duplicate-guard-structural.js';
import { runConceptualDuplicateGuard } from './unified-duplicate-guard-conceptual.js';
import { buildUnifiedDuplicateSummary } from './unified-duplicate-guard-summary.js';

export async function executeUnifiedDuplicateRisk({
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
    const previousFindings = loadUnifiedPreviousFindings(repo, normalizedFilePath);

    const structuralPromise = enableStructural
        ? runStructuralDuplicateGuard(repo, normalizedFilePath, providedAtoms, { maxFindings, minLinesOfCode })
        : Promise.resolve([]);

    const conceptualPromise = enableConceptual
        ? runConceptualDuplicateGuard(repo, rootPath, normalizedFilePath, { maxFindings, minLinesOfCode })
        : Promise.resolve([]);

    const [structuralFindings, conceptualFindings] = await Promise.all([
        structuralPromise,
        conceptualPromise
    ]);

    const resultMessage = `[UNIFIED DUPLICATE GUARD] ${normalizedFilePath}: structural=${structuralFindings.length}, conceptual=${conceptualFindings.length}`;
    if (structuralFindings.length > 0 || conceptualFindings.length > 0) {
        logger.warn(resultMessage);
    } else {
        logger.debug(resultMessage);
    }

    const coordinated = coordinateUnifiedDuplicateFindings(structuralFindings, conceptualFindings);
    const allFindings = [...structuralFindings, ...conceptualFindings];
    const debtHistory = buildUnifiedDebtHistory(normalizedFilePath, allFindings, previousFindings);
    const summary = buildUnifiedDuplicateSummary(rootPath, normalizedFilePath, coordinated, debtHistory);

    return {
        structuralFindings,
        conceptualFindings,
        coordinated: { ...coordinated, summary },
        debtHistory,
        totalFindings: allFindings.length
    };
}
