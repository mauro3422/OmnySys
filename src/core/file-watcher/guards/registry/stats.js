export function buildRegistryStats(semanticGuards, impactGuards, metadata) {
    const byType = {
        semantic: semanticGuards.size,
        impact: impactGuards.size
    };

    const byDomain = {};
    for (const meta of metadata.values()) {
        const domain = meta.domain || 'unknown';
        byDomain[domain] = (byDomain[domain] || 0) + 1;
    }

    return {
        total: semanticGuards.size + impactGuards.size,
        byType,
        byDomain
    };
}
