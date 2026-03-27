import { createLogger } from '../../../utils/logger.js';
import { clearWatcherIssue } from '../watcher-issue-persistence.js';
import { clearPersistedSharedStateContentionIssues, persistSharedStateContentionIssue } from './shared-state-persistence.js';
import {
    buildSharedStateContentionIssue,
    resolveSharedStateContentionSeverity
} from './shared-state-issues.js';
import {
    getSharedStateContentionSummaryForAtoms,
    resolveHotSharedStateAtom
} from './shared-state-summary.js';

const logger = createLogger('OmnySys:file-watcher:guards:shared-state');

export async function detectSharedStateContention(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        contentionThreshold = 15,
        criticalThreshold = 30,
        verbose = true
    } = options;

    try {
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

        if (verbose) {
            logger.warn(`[SHARED STATE][${severity.toUpperCase()}] ${filePath}: maxContention=${maxContention}, hotAtom=${hotAtom?.name}`);
        }

        EventEmitterContext.emit('shared-state:contention', {
            filePath,
            severity,
            message,
            maxContention,
            hotAtom: hotAtom?.name,
            totalContention
        });

        await persistSharedStateContentionIssue(
            rootPath,
            filePath,
            issueType,
            severity,
            message,
            context
        );

        if (severity !== 'high') await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_high');
        if (severity !== 'medium') await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_medium');
        if (severity !== 'low') await clearWatcherIssue(rootPath, filePath, 'sem_shared_state_low');

        return { severity, maxContention, totalContention, context };
    } catch (error) {
        logger.debug(`[SHARED STATE GUARD SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}
