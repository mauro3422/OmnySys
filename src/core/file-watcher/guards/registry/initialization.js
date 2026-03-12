export async function initializeDefaultGuards({
    semanticGuards,
    impactGuards,
    logger,
    registerAllDefaultSemanticGuards,
    registerAllDefaultImpactGuards,
    registry
}) {
    await registerAllDefaultSemanticGuards(registry);
    await registerAllDefaultImpactGuards(registry);

    logger.info(
        `Guard registry initialized with ${semanticGuards.size} semantic and ${impactGuards.size} impact guards`
    );
}
