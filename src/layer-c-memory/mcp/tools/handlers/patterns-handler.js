import { getSemanticSurfaceGranularity } from '../../../../shared/compiler/index.js';

export async function handlePatterns(tool, options) {
    const result = await tool.getEventPatterns({
        offset: options.offset || 0,
        limit: options.limit || 20,
        type: options.patternType || 'all',
        minSeverity: options.minSeverity || 0
    });

    let semanticSummary = { total: 0, byType: {} };
    const db = tool.repo?.db;
    if (db) {
        try {
            const semanticSurface = getSemanticSurfaceGranularity(db);
            semanticSummary = {
                total: semanticSurface.fileLevel.total,
                byType: semanticSurface.fileLevel.byType,
                atomLevel: semanticSurface.atomLevel,
                contract: semanticSurface.contract
            };
        } catch (e) { }
    }

    return {
        aggregationType: 'patterns',
        eventPatterns: result,
        semanticConnections: semanticSummary,
        summary: {
            totalEventPatterns: result.total,
            emitters: result.patterns.filter(p => p.hasEmitters).length,
            listeners: result.patterns.filter(p => p.hasListeners).length,
            totalSemanticConnections: semanticSummary.total,
            semanticByType: semanticSummary.byType
        }
    };
}

export async function handleAsyncAnalysis(tool, options) {
    const result = await tool.getAsyncAnalysis({
        offset: options.offset || 0,
        limit: options.limit || 20,
        withNetworkCalls: options.withNetworkCalls || false,
        withErrorHandling: options.withErrorHandling || false
    });

    return {
        aggregationType: 'async_analysis',
        ...result,
        summary: {
            totalAsync: result.total,
            withNetworkCalls: result.asyncAtoms.filter(a => a.hasNetworkCalls).length,
            withErrorHandling: result.asyncAtoms.filter(a => a.hasErrorHandling).length,
            highComplexity: result.asyncAtoms.filter(a => a.complexity > 10).length
        }
    };
}
