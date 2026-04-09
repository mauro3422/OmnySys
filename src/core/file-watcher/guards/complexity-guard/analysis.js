import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    severityFromComplexity,
    severityFromLines,
    isValidGuardTarget,
    extractAtomMetrics
} from '../guard-standards.js';
import { StandardSuggestions } from '../guard-standards/suggestions.js';
import {
    buildPropagationPlan,
    resolveArchitecturalRecommendation,
    summarizePropagationPlan
} from '../../../../shared/compiler/index.js';

const RELEVANT_PURPOSES = [
    'API_EXPORT',
    'CLASS_METHOD',
    'INTERNAL_HELPER',
    'PRIVATE_HELPER',
    'NETWORK_HANDLER',
    'TIMER_ASYNC',
    'ENTRY_POINT',
    'WORKER_ENTRY'
];

export function buildComplexityPropagation({
    filePath,
    atomName,
    severity = 'medium',
    metricType = 'complexity',
    metricValue = 0,
    threshold = 0,
    issueCount = 1
}) {
    return summarizePropagationPlan(buildPropagationPlan({
        changeType: 'policy_drift',
        scopePath: filePath || null,
        focusPath: filePath || null,
        severity,
        impactedFileCount: filePath ? 1 : 0,
        rewriteCount: issueCount,
        candidateCount: Math.max(issueCount, 1),
        validationTargetCount: 1,
        topCandidates: atomName ? [{
            name: atomName,
            filePath: filePath || null
        }] : [],
        topImpactedFiles: filePath ? [{ filePath }] : [],
        guidance: 'Surface complexity findings to watcher persistence, health snapshots, and refactoring governance before trusting coordinator growth.',
        recommendationStrategy: 'complexity_guard',
        drift: {
            state: issueCount > 0 ? 'watch' : 'stable',
            reason: `${metricType}=${metricValue} threshold=${threshold}`
        }
    }));
}

export function summarizeComplexityPropagation(filePath, issues = [], severity = 'medium') {
    const topIssue = issues[0];
    if (!topIssue) {
        return buildComplexityPropagation({
            filePath,
            severity,
            metricType: 'complexity',
            issueCount: 0
        });
    }

    return summarizePropagationPlan(buildPropagationPlan({
        changeType: 'policy_drift',
        scopePath: filePath || null,
        focusPath: filePath || null,
        severity,
        impactedFileCount: filePath ? 1 : 0,
        rewriteCount: issues.length,
        candidateCount: issues.length,
        validationTargetCount: 1,
        topCandidates: issues.slice(0, 5).map((issue) => ({
            name: issue.atomName,
            filePath: filePath || null
        })),
        topImpactedFiles: filePath ? [{ filePath }] : [],
        guidance: 'Surface complexity findings to watcher persistence, health snapshots, and refactoring governance before trusting coordinator growth.',
        recommendationStrategy: 'complexity_guard',
        drift: {
            state: issues.length > 0 ? 'watch' : 'stable',
            reason: `${issues.length} complexity finding(s) across ${topIssue.metricType}`
        }
    }));
}

export function collectComplexityIssues(filePath, atoms, thresholds) {
    const issues = [];
    const operationalRole = thresholds.operationalRole;
    const coordinatorRefactorSuggestion = operationalRole.role === 'orchestrator'
        ? StandardSuggestions.COORDINATOR_EXTRACTION
        : StandardSuggestions.COMPLEXITY_SPLIT;

    atoms.forEach((atom) => {
        if (!shouldAnalyzeAtom(atom)) {
            return;
        }

        const metrics = extractAtomMetrics(atom);
        addComplexityIssue(issues, filePath, metrics, thresholds, coordinatorRefactorSuggestion, operationalRole);
        addFunctionLengthIssue(issues, filePath, metrics, thresholds, coordinatorRefactorSuggestion, operationalRole);
    });

    return issues;
}

function shouldAnalyzeAtom(atom) {
    if (!isValidGuardTarget(atom)) {
        return false;
    }

    const purpose = atom.purpose || atom.purpose_type || '';
    return RELEVANT_PURPOSES.includes(purpose);
}

function addComplexityIssue(issues, filePath, metrics, thresholds, coordinatorRefactorSuggestion, operationalRole) {
    const severity = severityFromComplexity(metrics.complexity);
    if (!severity) {
        return;
    }
    const threshold = severity === 'high' ? thresholds.complexityHigh : thresholds.complexityMedium;
    const propagation = buildComplexityPropagation({
        filePath,
        atomName: metrics.name,
        severity,
        metricType: 'cyclomatic_complexity',
        metricValue: metrics.complexity,
        threshold
    });

    const recommendation = resolveArchitecturalRecommendation({
        issueType: createIssueType(IssueDomains.CODE, 'complexity', severity),
        filePath,
        operationalRole
    });
    const suggestedAction = recommendation?.action
        || (metrics.complexity >= thresholds.complexityHigh
            ? `${coordinatorRefactorSuggestion} (consider extracting helper functions)`
            : StandardSuggestions.COMPLEXITY_REFACTOR);
    const suggestedAlternatives = recommendation?.alternatives || [
        'Extract nested conditions into separate functions',
        'Use early returns to reduce nesting',
        'Leave a thin coordinator and move branches into dedicated modules',
        'Consider using a strategy pattern for complex conditionals',
        'Add unit tests for each branch'
    ];

    issues.push({
        atomId: metrics.id,
        atomName: metrics.name,
        severity,
        issueType: createIssueType(IssueDomains.CODE, 'complexity', severity),
        metricType: 'complexity',
        message: `Function '${metrics.name}' has complexity ${metrics.complexity} (threshold: ${severity === 'high' ? thresholds.complexityHigh : thresholds.complexityMedium})`,
        context: createStandardContext({
            guardName: 'complexity-guard',
            atomId: metrics.id,
            atomName: metrics.name,
            metricValue: metrics.complexity,
            threshold,
            severity,
            suggestedAction,
            suggestedAlternatives,
            extraData: {
                metricType: 'cyclomatic_complexity',
                linesOfCode: metrics.linesOfCode,
                isAsync: metrics.isAsync,
                functionType: metrics.type,
                operationalRole,
                propagation
            }
        })
    });
}

function addFunctionLengthIssue(issues, filePath, metrics, thresholds, coordinatorRefactorSuggestion, operationalRole) {
    const severity = severityFromLines(metrics.linesOfCode);
    if (!severity || alreadyReported(issues, metrics.id, severity)) {
        return;
    }
    const threshold = severity === 'high' ? thresholds.linesHigh : thresholds.linesMedium;
    const propagation = buildComplexityPropagation({
        filePath,
        atomName: metrics.name,
        severity,
        metricType: 'lines_of_code',
        metricValue: metrics.linesOfCode,
        threshold
    });

    const recommendation = resolveArchitecturalRecommendation({
        issueType: createIssueType(IssueDomains.CODE, 'function_length', severity),
        filePath,
        operationalRole
    });
    const suggestedAction = recommendation?.action || coordinatorRefactorSuggestion;
    const suggestedAlternatives = recommendation?.alternatives || [
        'Extract logical sections into private methods',
        'Keep a thin coordinator and move workflows into handlers or strategies',
        'Use the Extract Method refactoring pattern',
        'Consider creating a class to hold related functionality',
        'Document why the function is long if it cannot be split'
    ];

    issues.push({
        atomId: metrics.id,
        atomName: metrics.name,
        severity,
        issueType: createIssueType(IssueDomains.CODE, 'function_length', severity),
        metricType: 'lines',
        message: `Function '${metrics.name}' is ${metrics.linesOfCode} lines long (threshold: ${severity === 'high' ? thresholds.linesHigh : thresholds.linesMedium})`,
        context: createStandardContext({
            guardName: 'complexity-guard',
            atomId: metrics.id,
            atomName: metrics.name,
            metricValue: metrics.linesOfCode,
            threshold,
            severity,
            suggestedAction,
            suggestedAlternatives,
            extraData: {
                metricType: 'lines_of_code',
                complexity: metrics.complexity,
                isAsync: metrics.isAsync,
                functionType: metrics.type,
                operationalRole,
                propagation
            }
        })
    });
}

function alreadyReported(issues, atomId, severity) {
    return issues.some((issue) => issue.atomId === atomId && issue.severity === severity);
}
