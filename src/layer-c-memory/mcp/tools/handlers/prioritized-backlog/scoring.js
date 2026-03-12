import { classifyFileOperationalRole } from '#shared/compiler/index.js';

const DOMAIN_WEIGHTS = {
    arch: 1.0,
    sem: 0.9,
    code: 0.7,
    perf: 0.6,
    runtime: 0.5
};

const SEVERITY_MULTIPLIERS = {
    high: 1.0,
    medium: 0.7,
    low: 0.4,
    info: 0.2
};

const CONFIDENCE_LEVELS = {
    high_confidence: 1.0,
    medium_confidence: 0.7,
    low_confidence: 0.4
};

const SIGNAL_QUALITY = {
    high_signal: 1.0,
    normal_signal: 0.8,
    low_signal: 0.5
};

const SUGGESTED_ACTIONS = {
    code_complexity_high: 'Refactor function to reduce cyclomatic complexity (extract methods, simplify conditionals)',
    code_function_length_high: 'Split long function into smaller focused functions',
    sem_data_flow_high: 'Review data-flow logic - check for disconnected inputs/outputs',
    arch_impact_high: 'Review all related files before committing this change',
    arch_impact_medium: 'Check related files for unexpected side effects',
    arch_impact_low: 'Monitor for potential ripple effects',
    pipeline_orphan: 'Verify import connections and re-export relationships',
    duplicate_code: 'Extract common logic into shared function',
    race_condition: 'Review async patterns - add proper synchronization',
    shared_state_contention: 'Reduce shared state or implement proper locking',
    event_leak: 'Add cleanup logic for event listeners'
};

const EFFORT_ESTIMATES = {
    code_complexity_high: { min: 2, max: 8 },
    code_function_length_high: { min: 1, max: 4 },
    sem_data_flow_high: { min: 2, max: 6 },
    arch_impact_high: { min: 4, max: 12 },
    arch_impact_medium: { min: 2, max: 6 },
    arch_impact_low: { min: 0.5, max: 2 },
    duplicate_code: { min: 1, max: 3 },
    race_condition: { min: 3, max: 10 },
    shared_state_contention: { min: 4, max: 16 }
};

const DEFAULT_EFFORT = {
    high: { min: 2, max: 8 },
    medium: { min: 1, max: 4 },
    low: { min: 0.5, max: 2 }
};

export function calculateCausalScore(item, recurrenceData) {
    const confidenceScore = CONFIDENCE_LEVELS[item.confidence?.level]
        || CONFIDENCE_LEVELS[item.confidence]
        || 0.5;
    const signalQuality = SIGNAL_QUALITY[item.confidence?.signal] || 0.8;
    const signalComponent = confidenceScore * signalQuality * 0.30;

    const impactScore = (item.context?.metricValue || item.impact || 50) / 100;
    const severityMultiplier = SEVERITY_MULTIPLIERS[item.severity] || 0.5;
    const impactComponent = Math.min(impactScore * severityMultiplier, 1.0) * 0.25;

    const domain = resolveDomain(item);
    const domainWeight = DOMAIN_WEIGHTS[domain] || 0.5;
    const domainComponent = domainWeight * 0.20;

    const ageHours = getAgeHours(item.detectedAt || item.timestamp || item.context?.timestamp);
    const freshnessComponent = getFreshnessScore(ageHours) * 0.15;

    const recurrenceCount = recurrenceData[`${item.filePath}::${item.issueType}`] || 1;
    const recurrenceComponent = Math.min(recurrenceCount / 3, 1.0) * 0.10;

    const totalScore = signalComponent
        + impactComponent
        + domainComponent
        + freshnessComponent
        + recurrenceComponent;

    return {
        score: roundScore(totalScore),
        components: {
            signal: roundScore(signalComponent),
            impact: roundScore(impactComponent),
            domain: roundScore(domainComponent),
            freshness: roundScore(freshnessComponent),
            recurrence: roundScore(recurrenceComponent)
        },
        breakdown: {
            confidenceLevel: item.confidence?.level,
            signalQuality: item.confidence?.signal,
            impactValue: item.context?.metricValue,
            severity: item.severity,
            domain,
            ageHours,
            recurrenceCount
        }
    };
}

export function generateSuggestedAction(item) {
    const operationalRole = classifyFileOperationalRole(item.filePath || '');
    const isCoordinator = operationalRole.role === 'orchestrator';

    if (
        isCoordinator
        && (
            item.issueType?.includes('code_complexity')
            || item.issueType?.includes('code_function_length')
            || item.issueType?.includes('code_file_size')
        )
    ) {
        return 'Extract a thin coordinator and move checks, handlers or strategies into dedicated cohesive modules';
    }

    for (const [pattern, action] of Object.entries(SUGGESTED_ACTIONS)) {
        if (item.issueType?.includes(pattern)) {
            return action;
        }
    }

    return item.context?.suggestedAction
        || item.suggestedAction
        || 'Review and address this issue';
}

export function estimateEffort(item) {
    for (const [pattern, effort] of Object.entries(EFFORT_ESTIMATES)) {
        if (item.issueType?.includes(pattern)) {
            return effort;
        }
    }

    return DEFAULT_EFFORT[item.severity] || { min: 1, max: 4 };
}

export function getScoringFormula() {
    return {
        description: 'signal*0.30 + impact*0.25 + domain*0.20 + freshness*0.15 + recurrence*0.10',
        weights: {
            signal: 0.30,
            impact: 0.25,
            domain: 0.20,
            freshness: 0.15,
            recurrence: 0.10
        },
        domainWeights: DOMAIN_WEIGHTS,
        severityMultipliers: SEVERITY_MULTIPLIERS
    };
}

function resolveDomain(item) {
    return item.context?.domain
        || (item.issueType?.includes('arch') ? 'arch'
            : item.issueType?.includes('sem') ? 'sem'
                : item.issueType?.includes('code') ? 'code'
                    : item.issueType?.includes('perf') ? 'perf'
                        : 'runtime');
}

function getAgeHours(timestamp) {
    if (!timestamp) {
        return null;
    }

    return Math.round((Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60));
}

function getFreshnessScore(ageHours) {
    if (ageHours === null || ageHours < 1) {
        return 1.0;
    }

    if (ageHours < 24) {
        return 0.8;
    }

    if (ageHours < 72) {
        return 0.6;
    }

    return 0.4;
}

function roundScore(value) {
    return Math.round(value * 1000) / 1000;
}
