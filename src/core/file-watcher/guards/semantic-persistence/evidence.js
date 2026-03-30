import { connectionManager } from '../../../../layer-c-memory/storage/database/connection.js';
import { getSemanticPersistenceTargetNames, loadSemanticPersistenceRows } from './query.js';
import { evaluateSemanticPersistenceRows } from './analysis.js';

export async function loadSemanticPersistenceEvidence(rootPath, filePath, atoms = []) {
    const targetNames = getSemanticPersistenceTargetNames(atoms);
    if (targetNames.length === 0) {
        return null;
    }

    if (!connectionManager.isInitialized()) {
        return null;
    }

    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(rootPath);
    const db = repo?.db || null;
    if (!db) {
        return null;
    }

    try {
        const rows = loadSemanticPersistenceRows(db, filePath, targetNames);
        return evaluateSemanticPersistenceRows(rows);
    } catch {
        return null;
    }
}
