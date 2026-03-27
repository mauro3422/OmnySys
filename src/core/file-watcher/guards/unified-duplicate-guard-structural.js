import { createLogger } from '../../../utils/logger.js';
import {
    getDuplicateKeySqlForMode,
    DUPLICATE_MODES
} from '#layer-c/storage/repository/utils/index.js';
import {
    buildStructuralFindings,
    collectCandidateDnas,
    loadStructuralDuplicateRows,
    loadStructuralLocalAtoms
} from './duplicate-structural-core.js';
import { isLowSignalName } from './guard-standards.js';

const logger = createLogger('OmnySys:file-watcher:guards:unified-duplicate:structural');
const DUPLICATE_MODE = DUPLICATE_MODES.STRUCTURAL;
const DUPLICATE_KEY_SQL = getDuplicateKeySqlForMode(DUPLICATE_MODE, 'a.dna_json');

export async function runStructuralDuplicateGuard(repo, normalizedFilePath, providedAtoms, options = {}) {
    const { maxFindings = 10, minLinesOfCode = 3 } = options;

    try {
        const localAtoms = loadStructuralLocalAtoms({
            repo,
            normalizedFilePath,
            providedAtoms,
            minLinesOfCode,
            maxFindings,
            duplicateMode: DUPLICATE_MODE,
            duplicateKeySql: DUPLICATE_KEY_SQL
        });

        if (localAtoms.length === 0) {
            return [];
        }

        const candidateDnas = collectCandidateDnas(localAtoms, normalizedFilePath, isLowSignalName);
        if (candidateDnas.length === 0) {
            return [];
        }

        const duplicateRows = loadStructuralDuplicateRows(repo, candidateDnas, normalizedFilePath, DUPLICATE_KEY_SQL);
        if (duplicateRows.length === 0) {
            return [];
        }

        return buildStructuralFindings(localAtoms, duplicateRows, normalizedFilePath, maxFindings);
    } catch (error) {
        logger.debug(`[STRUCTURAL GUARD SKIP] ${normalizedFilePath}: ${error.message}`);
        return [];
    }
}
