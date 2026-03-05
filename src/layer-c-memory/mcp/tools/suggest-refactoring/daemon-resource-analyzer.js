/**
 * Daemon Resource Lifecycle Analyzer
 * Detects potential leaks like missing clearInterval, unclosed watchers, or orphaned servers.
 * @module mcp/tools/suggest-refactoring/daemon-resource-analyzer
 */

export function analyzeResourceLifecycle(atoms) {
    const suggestions = [];

    // Keywords that indicate resource creation
    const RESOURCE_CREATORS = [
        { name: 'setInterval', cleanup: 'clearInterval', type: 'timer_leak' },
        { name: 'fs.watch', cleanup: 'close', type: 'watcher_leak' },
        { name: 'http.createServer', cleanup: 'close', type: 'server_leak' },
        { name: 'net.createServer', cleanup: 'close', type: 'server_leak' }
    ];

    for (const atom of atoms) {
        if (!atom.dataFlowJson && !atom.calls_json) continue;

        const code = (atom.dataFlowJson || '') + (atom.calls_json || '');

        for (const creator of RESOURCE_CREATORS) {
            if (code.includes(creator.name)) {
                // Check if cleanup exists in the same atom
                const hasCleanup = code.includes(creator.cleanup);

                // Heuristic: If it's a setInterval/watch and doesn't store the returned handle, it's a high-risk leak
                const isStored = /const\s+\w+\s*=\s*/.test(code) || /let\s+\w+\s*=\s*/.test(code) || /this\.\w+\s*=\s*/.test(code);

                if (!hasCleanup && !isStored) {
                    suggestions.push({
                        type: creator.type,
                        severity: 'high',
                        target: atom.id,
                        name: atom.name,
                        file: atom.filePath,
                        line: atom.lineStart,
                        suggestion: `Potential ${creator.name} leak detected. Handle is not stored or cleared.`,
                        reason: `When a daemon creates long-lived resources like timers or watchers without storing their handles, they become "zombies" that cannot be cleaned up during hot-reloads, eventually crashing the daemon due to OOM or handle exhaustion.`,
                        benefit: `Prevents resource accumulation and ensures stable long-term daemon operation.`
                    });
                } else if (!hasCleanup && isStored) {
                    // Stored but no cleanup in the same atom - check if it's a class where cleanup might be elsewhere
                    // This is a lower severity "warning"
                    suggestions.push({
                        type: creator.type,
                        severity: 'medium',
                        target: atom.id,
                        name: atom.name,
                        file: atom.filePath,
                        line: atom.lineStart,
                        suggestion: `${creator.name} handle is stored but no local cleanup (${creator.cleanup}) found.`,
                        reason: `Ensure this resource is cleared in a 'close' or 'teardown' method to avoid leaks during daemon lifecycle transitions.`,
                        benefit: `Promotes robust lifecycle management.`
                    });
                }
            }
        }

        // Special check for EventEmitters without .removeAllListeners() in teardowns
        if (code.includes('.on(') && atom.name.toLowerCase().includes('init')) {
            suggestions.push({
                type: 'listener_leak',
                severity: 'medium',
                target: atom.id,
                name: atom.name,
                file: atom.filePath,
                line: atom.lineStart,
                suggestion: `Event listener registered in init/constructor without matching removal.`,
                reason: `Frequent daemon reloads will accumulate duplicate event listeners if not explicitly removed, leading to memory leaks and multiple handler executions for single events.`,
                benefit: `Ensures event processing remains singular and efficient.`
            });
        }
    }

    return suggestions;
}
