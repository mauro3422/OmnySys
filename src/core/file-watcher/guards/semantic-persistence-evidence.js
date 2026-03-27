import { isValidGuardTarget } from './guard-standards.js';

function hasPersistedJson(value) {
    return value !== null && value !== undefined && value !== '' && value !== 'null';
}

function parseJsonValue(value, fallback = null) {
    if (!hasPersistedJson(value)) return fallback;
    if (typeof value !== 'string') return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function getTargetNames(atoms = []) {
    return atoms
        .filter(isValidGuardTarget)
        .map((atom) => atom?.name)
        .filter(Boolean);
}

export async function loadSemanticPersistenceEvidence(rootPath, filePath, atoms = []) {
    const targetNames = getTargetNames(atoms);
    if (targetNames.length === 0) {
        return null;
    }

    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(rootPath);
    const db = repo?.db || null;
    if (!db) {
        return null;
    }

    try {
        const placeholders = targetNames.map(() => '?').join(',');
        const rows = db.prepare(`
            SELECT
                id,
                name,
                atom_type,
                dna_json,
                data_flow_json,
                signature_json
            FROM atoms
            WHERE file_path = ?
              AND name IN (${placeholders})
              AND (is_removed IS NULL OR is_removed = 0)
        `).all(filePath, ...targetNames);

        if (rows.length === 0) {
            return null;
        }

        const persistedTargets = rows.filter((row) => isValidGuardTarget({
            type: row.atom_type,
            name: row.name,
            isRemoved: false,
            isDeadCode: false
        }));

        if (persistedTargets.length === 0) {
            return null;
        }

        const missingDna = [];
        const missingDataFlow = [];
        const missingSignature = [];

        for (const row of persistedTargets) {
            if (!hasPersistedJson(row.dna_json)) {
                missingDna.push(row.name);
            }

            const dataFlow = parseJsonValue(row.data_flow_json);
            if (!dataFlow || typeof dataFlow !== 'object') {
                missingDataFlow.push(row.name);
            }

            const signature = parseJsonValue(row.signature_json);
            if (!signature || typeof signature !== 'object') {
                missingSignature.push(row.name);
            }
        }

        if (missingDna.length === 0 && missingDataFlow.length === 0 && missingSignature.length === 0) {
            return null;
        }

        const missingAny = new Set([...missingDna, ...missingDataFlow, ...missingSignature]);
        const ratio = persistedTargets.length > 0 ? missingAny.size / persistedTargets.length : 0;
        const severity = ratio >= 0.5 || missingDna.length > 0 ? 'high' : 'medium';

        return {
            persistedTargets: persistedTargets.length,
            missingDna,
            missingDataFlow,
            missingSignature,
            missingAny,
            ratio,
            severity
        };
    } finally {
        db.close();
    }
}
