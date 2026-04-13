import { createLogger } from '../../../../utils/logger.js';
import {
    getDuplicateKeySqlForMode,
    DUPLICATE_MODES
} from '../../../../layer-c-memory/storage/repository/utils/index.js';
import {
    normalizeFilePath,
    isCanonicalDuplicateSignalPolicyFile
} from '../../../../shared/compiler/index.js';
import { connectionManager } from '../../../../layer-c-memory/storage/database/connection.js';
import {
    clearStructuralDuplicateIssues
} from '../duplicate-structural/index.js';
import {
    runStructuralDuplicateDetection
} from './detection.js';
import {
    persistStructuralDuplicateFinding
} from '../duplicate-risk-remediation/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:duplicate');
const DUPLICATE_MODE = DUPLICATE_MODES.STRUCTURAL;
const DUPLICATE_KEY_SQL = getDuplicateKeySqlForMode(DUPLICATE_MODE, 'a.dna_json');

export async function executeDuplicateRisk(rootPath, filePath, EventEmitterContext, options = {}) {
    try {
        const {
            maxFindings = 8,
            minLinesOfCode = 4,
            atoms: providedAtoms = null
        } = options;

        const normalizedFilePath = normalizeFilePath(filePath);

        if (isCanonicalDuplicateSignalPolicyFile(normalizedFilePath)) {
            await clearStructuralDuplicateIssues(rootPath, normalizedFilePath);
            return [];
        }

        if (!connectionManager.isInitialized()) {
            return [];
        }

        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(rootPath);
        if (!repo?.db) {
            return [];
        }

        const findings = runStructuralDuplicateDetection({
            repo,
            normalizedFilePath,
            providedAtoms,
            minLinesOfCode,
            maxFindings,
            duplicateMode: DUPLICATE_MODE,
            duplicateKeySql: DUPLICATE_KEY_SQL
        });

        if (findings.length === 0) {
            await clearStructuralDuplicateIssues(rootPath, normalizedFilePath);
            return [];
        }

        await persistStructuralDuplicateFinding({
            rootPath,
            normalizedFilePath,
            findings,
            eventEmitterContext: EventEmitterContext,
            maxFindings
        });

        return findings;
    } catch (error) {
        logger.debug(`[DUPLICATE EXECUTION SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export { DUPLICATE_MODE, DUPLICATE_KEY_SQL };
