/**
 * Test file for Integrity Guards MCP Integration
 */

// 1. Violation: Naming mismatch (async name, sync execution)
export function asyncDataFetcherSync() {
    console.log("Fetching data... but I am synchronous!");
    return { data: "mock" };
}

// 2. Violation: Unused inputs logic
export function processWithUnused(a, b, c) {
    const result = a + b;
    return result;
}

// 3. Potential: Shared state contention (if many things import/use this)
export const GLOBAL_SHARED_STATE = { count: 0 };

export function incrementGlobal() {
    GLOBAL_SHARED_STATE.count++;
}
