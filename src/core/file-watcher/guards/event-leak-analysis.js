export function analyzeEventListeners(code) {
    const result = {
        listenerCount: 0,
        hasCleanup: false,
        hasLeakRisk: false,
        usesOnce: false,
        eventNames: [],
        missingCleanupFor: []
    };

    if (!code) return result;

    const onPatterns = [
        /\.on\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /\.addEventListener\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /\.addListener\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];

    const offPatterns = [
        /\.off\s*\(/,
        /\.removeEventListener\s*\(/,
        /\.removeListener\s*\(/,
        /return\s*\(\s*\)\s*=>\s*\{[^}]*\.off|\.remove/
    ];

    const oncePattern = /\.once\s*\(/;

    for (const pattern of onPatterns) {
        const matches = [...code.matchAll(pattern)];
        result.listenerCount += matches.length;
        for (const match of matches) {
            if (match[1]) result.eventNames.push(match[1]);
        }
    }

    result.hasCleanup = offPatterns.some((pattern) => pattern.test(code));
    result.usesOnce = oncePattern.test(code);

    if (result.listenerCount > 0 && !result.hasCleanup && !result.usesOnce) {
        result.hasLeakRisk = true;
        result.missingCleanupFor = [...result.eventNames];
    }

    if (result.usesOnce && result.listenerCount <= 2) {
        result.hasLeakRisk = false;
    }

    return result;
}
