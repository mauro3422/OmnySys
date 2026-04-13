export async function initializeDefaultGuards({
    semanticGuards,
    impactGuards,
    logger,
    registerAllDefaultSemanticGuards,
    registerAllDefaultImpactGuards,
    registry
}) {
    const semanticResult = await registerAllDefaultSemanticGuards(registry);
    const impactResult = await registerAllDefaultImpactGuards(registry);
    
    const totalSemantic = (semanticResult?.registeredCount || 0) + (semanticResult?.failedCount || 0);
    const totalImpact = (impactResult?.registeredCount || 0) + (impactResult?.failedCount || 0);

    logger.info(
        `Guard registry initialized: ${semanticResult?.registeredCount || 0}/${totalSemantic} semantic, ${impactResult?.registeredCount || 0}/${totalImpact} impact guards${semanticResult?.failedCount > 0 || impactResult?.failedCount > 0 ? ` (${semanticResult?.failedCount || 0} semantic, ${impactResult?.failedCount || 0} impact failed)` : ''}`
    );
}
