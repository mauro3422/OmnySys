import { clearConceptualDuplicateIssues } from './duplicate-conceptual-core.js';
import { loadConceptualDuplicateRepo, loadConceptualDuplicateContext } from './conceptual-duplicate-risk-repo.js';
import { detectConceptualDuplicateFindings } from './conceptual-duplicate-risk-detection.js';
import { persistConceptualDuplicateFinding } from './conceptual-duplicate-risk-persistence.js';
import { normalizeFilePath, isCanonicalDuplicateSignalPolicyFile } from '../../../shared/compiler/index.js';
import { connectionManager } from '../../../layer-c-memory/storage/database/connection.js';

export async function executeConceptualDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}, logger) {
    try {
        const {
            maxFindings = 5,
            minLinesOfCode = 3
        } = options;
        const normalizedFilePath = normalizeFilePath(filePath);

        if (isCanonicalDuplicateSignalPolicyFile(normalizedFilePath)) {
            await clearConceptualDuplicateIssues(rootPath, normalizedFilePath);
            return [];
        }

        if (!connectionManager.isInitialized()) {
            return [];
        }

        const repo = await loadConceptualDuplicateRepo(rootPath);
        if (!repo?.db) {
            return [];
        }

        let previousFindings;
        let localAtoms;
        try {
            ({
                previousFindings,
                localAtoms
            } = loadConceptualDuplicateContext(
                repo,
                normalizedFilePath,
                minLinesOfCode
            ));
        } catch (error) {
            return [];
        }

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
    } catch (error) {
        logger?.debug?.(`[CONCEPTUAL DUPLICATE EXECUTION SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
