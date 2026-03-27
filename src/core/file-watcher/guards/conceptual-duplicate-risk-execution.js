import { clearConceptualDuplicateIssues } from './duplicate-conceptual-core.js';
import { loadConceptualDuplicateRepo, loadConceptualDuplicateContext } from './conceptual-duplicate-risk-repo.js';
import { detectConceptualDuplicateFindings } from './conceptual-duplicate-risk-detection.js';
import { persistConceptualDuplicateFinding } from './conceptual-duplicate-risk-persistence.js';
import { normalizeFilePath, isCanonicalDuplicateSignalPolicyFile } from '../../../shared/compiler/index.js';

export async function executeConceptualDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}, logger) {
    const {
        maxFindings = 5,
        minLinesOfCode = 3
    } = options;
    const normalizedFilePath = normalizeFilePath(filePath);

    if (isCanonicalDuplicateSignalPolicyFile(normalizedFilePath)) {
        await clearConceptualDuplicateIssues(rootPath, normalizedFilePath);
        return [];
    }

    const repo = await loadConceptualDuplicateRepo(rootPath);
    if (!repo?.db) {
        return [];
    }

    const {
        previousFindings,
        localAtoms
    } = loadConceptualDuplicateContext(
        repo,
        normalizedFilePath,
        minLinesOfCode
    );

    if (localAtoms.length === 0) {
        await clearConceptualDuplicateIssues(rootPath, normalizedFilePath);
        return [];
    }

    const findings = await detectConceptualDuplicateFindings({
        repo,
        normalizedFilePath,
        localAtoms,
        maxFindings,
        projectPath: rootPath
    });

    if (findings.length === 0) {
        await clearConceptualDuplicateIssues(rootPath, normalizedFilePath);
        return [];
    }

    await persistConceptualDuplicateFinding({
        rootPath,
        normalizedFilePath,
        findings,
        previousFindings,
        eventEmitterContext: EventEmitterContext,
        maxFindings
    });

    return findings;
}
