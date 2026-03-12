import {
    queryRaceConditions,
    queryEventPatterns,
    queryAsyncAtoms,
    querySocieties
} from '../semantic-queries.js';

function buildPaginatedResult(options, key, data, total) {
    const { offset = 0, limit = 20 } = options;
    return {
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
        [key]: data
    };
}

export function loadRaceConditions(repo, raceHandler, options = {}) {
    const { rows, total } = queryRaceConditions(repo.db, { ...options, includeRemoved: !!options.includeRemoved });
    return buildPaginatedResult(options, 'races', raceHandler.handle(rows), total);
}

export function loadEventPatterns(repo, eventHandler, options = {}) {
    const { rows, total } = queryEventPatterns(repo.db, { ...options, includeRemoved: !!options.includeRemoved });
    return buildPaginatedResult(options, 'patterns', eventHandler.handle(rows), total);
}

export function loadAsyncAnalysis(repo, asyncHandler, options = {}) {
    const { rows, total } = queryAsyncAtoms(repo.db, { ...options, includeRemoved: !!options.includeRemoved });
    return buildPaginatedResult(options, 'asyncAtoms', asyncHandler.handle(rows), total);
}

export function loadSocieties(repo, societyHandler, options = {}) {
    const { rows, total } = querySocieties(repo.db, { ...options, includeRemoved: !!options.includeRemoved });
    return buildPaginatedResult(options, 'societies', societyHandler.mapSocieties(rows), total);
}
