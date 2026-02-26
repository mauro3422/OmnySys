function generateSuggestedFix(race) {
    switch (race.type) {
        case 'WW': return 'Use atomic operations or implement locking mechanism';
        case 'RW': return 'Add synchronization before write operations or use immutable updates';
        case 'IE': return 'Use singleton pattern with proper initialization check or lazy initialization with locks';
        case 'EH': return 'Ensure event handlers are properly synchronized or use event queue';
        default: return 'Review concurrent access patterns and consider adding synchronization';
    }
}

export function generateStateReport(stateKey, raceResults) {
    const races = raceResults.races.filter(r => r.stateKey === stateKey);
    if (races.length === 0) return null;
    const accesses = races.flatMap(r => r.accesses);
    return {
        stateKey,
        raceCount: races.length,
        severity: Math.max(...races.map(r => ['low', 'medium', 'high', 'critical'].indexOf(r.severity))),
        accesses: accesses.map(a => ({
            function: a.atomName,
            module: a.module,
            file: a.file,
            type: a.type,
            line: a.line
        })),
        suggestedFix: generateSuggestedFix(races[0])
    };
}
