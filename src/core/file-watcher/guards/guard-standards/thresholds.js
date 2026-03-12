export const IssueDomains = {
    CODE: 'code',
    ARCH: 'arch',
    SEM: 'sem',
    RUNTIME: 'runtime',
    PERF: 'perf'
};

export const IssueSeverity = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info'
};

export const StandardThresholds = {
    COMPLEXITY_HIGH: 20,
    COMPLEXITY_MEDIUM: 15,
    COMPLEXITY_LOW: 10,
    LINES_HIGH: 150,
    LINES_MEDIUM: 100,
    FILE_LINES_CRITICAL: 400,
    FILE_LINES_HIGH: 300,
    IMPACT_HIGH: 18,
    IMPACT_MEDIUM: 10,
    IMPACT_LOW: 4,
    SHARED_STATE_HIGH: 10,
    SHARED_STATE_MEDIUM: 5,
    HOTSPOT_HIGH: 5,
    HOTSPOT_MEDIUM: 3,
    ASYNC_MAX_LINES: 50,
    COHERENCE_MIN: 0.3,
    LISTENERS_PER_EMITTER: 5
};

export function createIssueType(domain, subdomain, severity) {
    return `${domain}_${subdomain}_${severity}`;
}

export function severityFromComplexity(complexity) {
    if (complexity >= StandardThresholds.COMPLEXITY_HIGH) return IssueSeverity.HIGH;
    if (complexity >= StandardThresholds.COMPLEXITY_MEDIUM) return IssueSeverity.MEDIUM;
    if (complexity >= StandardThresholds.COMPLEXITY_LOW) return IssueSeverity.LOW;
    return null;
}

export function severityFromLines(lines) {
    if (lines >= StandardThresholds.LINES_HIGH) return IssueSeverity.HIGH;
    if (lines >= StandardThresholds.LINES_MEDIUM) return IssueSeverity.MEDIUM;
    return null;
}

export function severityFromFileLines(lines) {
    if (lines >= StandardThresholds.FILE_LINES_CRITICAL) return IssueSeverity.HIGH;
    if (lines >= StandardThresholds.FILE_LINES_HIGH) return IssueSeverity.MEDIUM;
    return null;
}

export function severityFromImpact(score) {
    if (score >= StandardThresholds.IMPACT_HIGH) return IssueSeverity.HIGH;
    if (score >= StandardThresholds.IMPACT_MEDIUM) return IssueSeverity.MEDIUM;
    if (score >= StandardThresholds.IMPACT_LOW) return IssueSeverity.LOW;
    return null;
}

export function severityFromSharedState(connectionCount) {
    if (connectionCount >= StandardThresholds.SHARED_STATE_HIGH) return IssueSeverity.HIGH;
    if (connectionCount >= StandardThresholds.SHARED_STATE_MEDIUM) return IssueSeverity.MEDIUM;
    return null;
}
