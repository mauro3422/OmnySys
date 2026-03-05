/**
 * Network analyzer for suggest-refactoring
 * @module mcp/tools/suggest-refactoring/network-analyzer
 */

/**
 * Analyzes network-related atoms for refactoring opportunities
 * @param {Array} atoms - Array of atoms
 * @returns {Array} - Array of suggestions
 */
export function analyzeNetworkConnections(atoms) {
    const suggestions = [];

    for (const atom of atoms) {
        // 1. Network God-Function: High complexity + network calls = mixed responsibilities
        if (atom.hasNetworkCalls && atom.complexity > 15) {
            suggestions.push({
                type: 'split_network_domain',
                severity: atom.complexity > 25 ? 'high' : 'medium',
                target: atom.id,
                name: atom.name,
                file: atom.filePath,
                line: atom.line,
                suggestion: `Complex function (${atom.complexity}) mixed with network calls. Extract domain logic from network adapters.`,
                reason: `Network-bound functions with high complexity are hard to mock and test. Separate the business logic (pure) from the I/O (impure).`,
                benefit: `Improves testability and prevents network failures from silently breaking domain state.`
            });
        }

        // 2. Missing Error Handling on Network Calls
        if (atom.hasNetworkCalls && !atom.hasErrorHandling) {
            suggestions.push({
                type: 'add_network_error_handling',
                severity: 'high',
                target: atom.id,
                name: atom.name,
                file: atom.filePath,
                line: atom.line,
                suggestion: `Network operations without error handling detected. Add try/catch or .catch() handlers.`,
                reason: `Network calls are inherently unpredictable. Missing error handling can crash the daemon or leave sockets hanging.`,
                benefit: `Prevents daemon crashes and memory leaks from unhandled socket/HTTP errors.`
            });
        }

        // 3. Daemon Risk: Async Network Calls without Error Handling (Unhandled Rejection Risk)
        if (atom.hasNetworkCalls && atom.isAsync && !atom.hasErrorHandling) {
            suggestions.push({
                type: 'add_daemon_safeguards',
                severity: 'high',
                target: atom.id,
                name: atom.name,
                file: atom.filePath,
                line: atom.line,
                suggestion: `Async network call lacks error handling. Add timeout mechanisms and graceful connection teardown.`,
                reason: `Async connection drops without error handling cause UnhandledPromiseRejection, crashing the Node.js daemon. It also misses socket timeouts.`,
                benefit: `Ensures the daemon stays resilient against network latency and drops.`
            });
        }

        // 4. Mutable Global State Risk
        if (atom.atom_type === 'variable' && !atom.name.toUpperCase().includes(atom.name)) {
            // Variable is not all uppercase (screaming constant)
            suggestions.push({
                type: 'mutable_global_state',
                severity: 'medium',
                target: atom.id,
                name: atom.name,
                file: atom.filePath,
                line: atom.line,
                suggestion: `Mutable global variable "${atom.name}" detected. Use a StateManager or wrap in a closure.`,
                reason: `Global mutable state in a daemon causes unpredictable behavior across restarts and makes unit testing nearly impossible.`,
                benefit: `Ensures deterministic behavior and simplifies debugging of state-related issues.`
            });
        }

        // 5. Async Event Listener Risk (Unhandled Rejection)
        if (atom.isAsync && (atom.name.startsWith('on') || atom.name.includes('Listener'))) {
            if (!atom.hasErrorHandling) {
                suggestions.push({
                    type: 'async_event_error_handling',
                    severity: 'high',
                    target: atom.id,
                    name: atom.name,
                    file: atom.filePath,
                    line: atom.line,
                    suggestion: `Async event listener lacks top-level try/catch.`,
                    reason: `Async event listeners in Node.js do not propagate errors to the caller. A crash here will trigger an UnhandledPromiseRejection, killing the daemon.`,
                    benefit: `Prevents silent daemon crashes during background event processing.`
                });
            }
        }

        // 6. MCP Session Breakage Risk: Process Restarts / Exits
        // ... (preserving previous logic but updating index)
        if (atom.dataFlowJson) {
            const dataFlowStr = atom.dataFlowJson;
            if (dataFlowStr.includes('process.exit') || dataFlowStr.includes('process.kill') || dataFlowStr.includes("'restart'")) {
                suggestions.push({
                    type: 'unsafe_process_termination',
                    severity: 'high',
                    target: atom.id,
                    name: atom.name,
                    file: atom.filePath,
                    line: atom.line,
                    suggestion: `Process termination or restart detected. Ensure clients are notified before disconnecting.`,
                    reason: `Forcefully restarting the daemon or exiting will instantly break all active MCP client sessions (e.g. Antigravity IDE) yielding [SESSION_EXPIRED] errors.`,
                    benefit: `Allows clients to gracefully detach or pause operations during daemon reloads.`
                });
            }
        }
    }

    return suggestions;
}
