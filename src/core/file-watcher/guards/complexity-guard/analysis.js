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
import { resolveArchitecturalRecommendation } from '../../../../shared/compiler/index.js';

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
            threshold: severity === 'high' ? thresholds.complexityHigh : thresholds.complexityMedium,
            severity,
            suggestedAction,
            suggestedAlternatives,
            extraData: {
                metricType: 'cyclomatic_complexity',
                linesOfCode: metrics.linesOfCode,
                isAsync: metrics.isAsync,
                functionType: metrics.type,
                operationalRole
            }
        })
    });
}

function addFunctionLengthIssue(issues, filePath, metrics, thresholds, coordinatorRefactorSuggestion, operationalRole) {
    const severity = severityFromLines(metrics.linesOfCode);
    if (!severity || alreadyReported(issues, metrics.id, severity)) {
        return;
    }

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
            threshold: severity === 'high' ? thresholds.linesHigh : thresholds.linesMedium,
            severity,
            suggestedAction,
            suggestedAlternatives,
            extraData: {
                metricType: 'lines_of_code',
                complexity: metrics.complexity,
                isAsync: metrics.isAsync,
                functionType: metrics.type,
                operationalRole
            }
        })
    });
}

function alreadyReported(issues, atomId, severity) {
    return issues.some((issue) => issue.atomId === atomId && issue.severity === severity);
}
