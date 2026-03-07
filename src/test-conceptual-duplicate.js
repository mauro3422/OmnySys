// Test file to verify conceptual duplicate detection
// This function has the same semantic fingerprint as existing functions

export function buildProvenance(data, options = {}) {
    // Different implementation from buildNotificationsProvenance and buildTelemetryProvenance
    // v5 - testing with logger
    const result = { 
        source: 'test-file-v5', 
        data,
        options,
        timestamp: Date.now(),
        version: 5
    };
    return result;
}
