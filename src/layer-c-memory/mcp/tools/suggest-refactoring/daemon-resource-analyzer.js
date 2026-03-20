/**
 * Daemon Resource Lifecycle Analyzer
 * Detects potential leaks like missing clearInterval, unclosed watchers, or orphaned servers.
 * @module mcp/tools/suggest-refactoring/daemon-resource-analyzer
 */

// Keywords that indicate resource creation
const RESOURCE_CREATORS = [
    { name: 'setInterval', cleanup: 'clearInterval', type: 'timer_leak' },
    { name: 'fs.watch', cleanup: 'close', type: 'watcher_leak' },
    { name: 'http.createServer', cleanup: 'close', type: 'server_leak' },
    { name: 'net.createServer', cleanup: 'close', type: 'server_leak' }
];

function hasStoredHandle(code) {
    return /const\s+\w+\s*=\s*/.test(code) ||
        /let\s+\w+\s*=\s*/.test(code) ||
        /this\.\w+\s*=\s*/.test(code);
}

function buildSuggestion(atom, creator, severity, suggestion, reason) {
    return {
        type: creator.type,
        severity,
        target: atom.id,
        name: atom.name,
        file: atom.filePath,
        line: atom.lineStart,
        suggestion,
        reason,
        benefit: 'Promotes robust lifecycle management.'
    };
}

function normalizeAtomSourceText(atom) {
    const candidates = [
        atom?.code,
        atom?.content,
        atom?.sourceCode,
        atom?.body,
        atom?.dataFlowJson
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;
        if (typeof candidate === 'string') {
            return candidate;
        }

        try {
            const serialized = JSON.stringify(candidate);
            if (serialized) return serialized;
        } catch {
            // Fall through to the next candidate.
        }
    }

    return '';
}

function analyzeAtomLifecycle(atom) {
    const code = normalizeAtomSourceText(atom);
    if (!code) return [];

    const atomName = String(atom.name || '').toLowerCase();
    const atomSuggestions = [];

    for (const creator of RESOURCE_CREATORS) {
        if (!code.includes(creator.name)) {
            continue;
        }

        const hasCleanup = code.includes(creator.cleanup);
        const storedHandle = hasStoredHandle(code);

        if (!hasCleanup && !storedHandle) {
            atomSuggestions.push(buildSuggestion(
                atom,
                creator,
                'high',
                `Potential ${creator.name} leak detected. Handle is not stored or cleared.`,
                `When a daemon creates long-lived resources like timers or watchers without storing their handles, they become "zombies" that cannot be cleaned up during hot-reloads, eventually crashing the daemon due to OOM or handle exhaustion.`
            ));
            continue;
        }

        if (!hasCleanup && storedHandle) {
            atomSuggestions.push(buildSuggestion(
                atom,
                creator,
                'medium',
                `${creator.name} handle is stored but no local cleanup (${creator.cleanup}) found.`,
                `Ensure this resource is cleared in a 'close' or 'teardown' method to avoid leaks during daemon lifecycle transitions.`
            ));
        }
    }

    if (code.includes('.on(') && atomName.includes('init')) {
        atomSuggestions.push({
            type: 'listener_leak',
            severity: 'medium',
            target: atom.id,
            name: atom.name,
            file: atom.filePath,
            line: atom.lineStart,
            suggestion: 'Event listener registered in init/constructor without matching removal.',
            reason: 'Frequent daemon reloads will accumulate duplicate event listeners if not explicitly removed, leading to memory leaks and multiple handler executions for single events.',
            benefit: 'Ensures event processing remains singular and efficient.'
        });
    }

    return atomSuggestions;
}

export function analyzeResourceLifecycle(atoms) {
    const suggestions = [];

    for (const atom of atoms) {
        suggestions.push(...analyzeAtomLifecycle(atom));
    }

    return suggestions;
}
