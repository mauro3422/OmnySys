import { summarizeSemanticCoverage } from '../../../shared/compiler/signal-coverage-aggregations-candidates.js';
import { isValidGuardTarget } from './guard-standards.js';

export async function loadSemanticCoverageEvidence(rootPath, filePath, atoms = []) {
    const candidates = atoms.filter(isValidGuardTarget);
    if (candidates.length === 0) {
        return null;
    }

    const atomIds = candidates.map((atom) => atom.id).filter(Boolean);
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(rootPath);
    const db = repo?.db || null;

    let sharesStateRelations = 0;
    try {
        if (db && atomIds.length > 0) {
            const placeholders = atomIds.map(() => '?').join(',');
            sharesStateRelations = db.prepare(`
                SELECT COUNT(*) AS n
                FROM atom_relations
                WHERE relation_type = 'shares_state'
                  AND (source_id IN (${placeholders}) OR target_id IN (${placeholders}))
            `).get(...atomIds, ...atomIds)?.n || 0;
        }

        const {
            networkCandidates,
            networkFlagged,
            sharedStateCandidates,
            gaps,
            severity
        } = summarizeSemanticCoverage(candidates, { filePath, sharesStateRelations });

        if (gaps.length === 0) {
            return null;
        }

        return {
            networkCandidates: networkCandidates.length,
            networkFlagged: networkFlagged.length,
            sharedStateCandidates: sharedStateCandidates.length,
            gaps,
            severity,
            sharesStateRelations
        };
    } finally {
        db?.close?.();
    }
}
