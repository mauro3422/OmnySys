import { getPhase2FileCounts } from '#shared/compiler/index.js';

export async function initializePhase2Start(indexer, logger) {
    logger.debug('Starting Background Phase 2 Indexer (Deep Metadata)...');
    indexer.startedAt = Date.now();

    try {
        const { getRepository } = await import('#layer-c/storage/repository/index.js');
        const repo = getRepository(indexer.projectPath);
        if (!repo?.db) {
            return;
        }

        const initialPending = getPhase2FileCounts(repo.db).pendingFiles;
        indexer.orchestrator.totalPhase2Files = initialPending;
        indexer._updateStatus(initialPending);

        if (initialPending > 0) {
            logger.debug(`Phase 2: Pending analysis for ${indexer.orchestrator.totalPhase2Files} files`);
            await indexer._ensureGlobalTimer(initialPending);
        }
    } catch {
        logger.debug('Could not initialize Phase 2 total count yet');
    }
}
