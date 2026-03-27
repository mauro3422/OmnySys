import { clearPersistedSharedStateContentionIssues } from './shared-state-persistence.js';
import { getSharedStateContentionSummaryForAtoms, resolveHotSharedStateAtom } from './shared-state-summary.js';
import { buildSharedStateContentionIssue, resolveSharedStateContentionSeverity } from './shared-state-issues.js';

export async function collectSharedStateContentionEvidence(rootPath, filePath, atoms = [], options = {}) {
    const {
        contentionThreshold = 15,
        criticalThreshold = 30
    } = options;

    if (!atoms || atoms.length === 0) {
        await clearPersistedSharedStateContentionIssues(rootPath, filePath);
        return null;
    }

    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(rootPath);
    if (!repo?.db) return null;

    const atomIds = atoms.map((atom) => atom.id).filter(Boolean);
    const sharedStateSummary = getSharedStateContentionSummaryForAtoms(
        repo.db,
        atomIds,
        contentionThreshold,
        criticalThreshold
    );
    const hotAtom = resolveHotSharedStateAtom(atoms, sharedStateSummary.hottestKey);
    const maxContention = sharedStateSummary.maxContention;
    const totalContention = sharedStateSummary.totalLinks;
    const severity = resolveSharedStateContentionSeverity(sharedStateSummary, criticalThreshold);

    if (!severity) {
        await clearPersistedSharedStateContentionIssues(rootPath, filePath);
        return null;
    }

    const { issueType, message, context } = buildSharedStateContentionIssue({
        hotAtom,
        maxContention,
        totalContention,
        severity,
        contentionThreshold,
        criticalThreshold,
        atomCount: atoms.length,
        sharedStateSummary
    });

    return {
        issueType,
        severity,
        message,
        context,
        maxContention,
        totalContention,
        hotAtom
    };
}
