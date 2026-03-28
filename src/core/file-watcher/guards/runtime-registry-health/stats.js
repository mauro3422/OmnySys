const registryStats = new Map();

export function getOrCreateRuntimeRegistryHealthStats(filePath) {
    if (!registryStats.has(filePath)) {
        registryStats.set(filePath, {
            initCalls: 0,
            lastInitTime: 0,
            initStartTime: 0,
            registrations: new Map()
        });
    }

    return registryStats.get(filePath);
}

export function resetRegistryStats() {
    registryStats.clear();
}

export function getRuntimeRegistryHealthStats() {
    const stats = {};
    for (const [filePath, data] of registryStats.entries()) {
        stats[filePath] = {
            initCalls: data.initCalls,
            lastInitTime: data.lastInitTime
        };
    }

    return stats;
}
