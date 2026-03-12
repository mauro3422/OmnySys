/**
 * Detects abrupt loss of call topology after a file change.
 */

import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardSuggestions,
    isValidGuardTarget
} from './guard-standards.js';
import { classifyFileOperationalRole } from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:file-watcher:guards:topology-regression');

const TEST_FILE_PATTERNS = /(^|\/)(tests?|__tests__|fixtures)\//i;

function atomKey(atom) {
    return `${atom?.type || 'unknown'}::${atom?.name || 'anonymous'}`;
}

function listCount(value) {
    return Array.isArray(value) ? value.length : 0;
}

function getTopologySignal(atom) {
    return Math.max(
        Number(atom?.callers_count) || 0,
        Number(atom?.callees_count) || 0,
        Number(atom?.callerCount) || 0,
        Number(atom?.calleeCount) || 0,
        Number(atom?.in_degree) || 0,
        Number(atom?.out_degree) || 0,
        listCount(atom?.calledBy),
        listCount(atom?.calls),
        listCount(atom?.internalCalls)
    );
}

function buildMatchedTopologyAtoms(previousAtoms = [], atoms = []) {
    const previousMap = new Map(
        previousAtoms
            .filter(isValidGuardTarget)
            .map((atom) => [atomKey(atom), atom])
    );

    return atoms
        .filter(isValidGuardTarget)
        .map((atom) => ({ current: atom, previous: previousMap.get(atomKey(atom)) }))
        .filter((pair) => pair.previous);
}

function summarizeTopologySignals(matched = []) {
    const previousSignal = matched.reduce((sum, pair) => sum + getTopologySignal(pair.previous), 0);
    const currentSignal = matched.reduce((sum, pair) => sum + getTopologySignal(pair.current), 0);

    const regressedAtoms = matched
        .filter((pair) => getTopologySignal(pair.previous) > 0 && getTopologySignal(pair.current) === 0)
        .map((pair) => ({
            name: pair.current.name,
            previousSignal: getTopologySignal(pair.previous),
            currentSignal: 0
        }));

    return {
        previousSignal,
        currentSignal,
        regressedAtoms
    };
}

function shouldSkipTopologyRegression(filePath, matched, regressedAtoms) {
    const fileRole = classifyFileOperationalRole(filePath);
    return (
        (
            fileRole.role === 'analyzer' ||
            fileRole.role === 'orchestrator' ||
            fileRole.role === 'builder' ||
            fileRole.role === 'bridge' ||
            fileRole.role === 'policy'
        ) &&
        regressedAtoms.length === 0 &&
        matched.length <= 2
    );
}

function getTopologyRegressionSeverity(previousSignal, currentSignal) {
    if (currentSignal === 0 && previousSignal >= 3) {
        return 'high';
    }

    const ratio = currentSignal / previousSignal;
    if (ratio < 0.2 && (previousSignal - currentSignal) >= 3) {
        return 'medium';
    }

    return null;
}

export async function detectTopologyRegression(rootPath, filePath, EventEmitterContext, options = {}) {
    const { previousAtoms = [], atoms = [], verbose = true } = options;

    try {
        await clearWatcherIssue(rootPath, filePath, 'arch_topology_regression_high');
        await clearWatcherIssue(rootPath, filePath, 'arch_topology_regression_medium');

        if (TEST_FILE_PATTERNS.test(filePath) || !Array.isArray(previousAtoms) || previousAtoms.length === 0 || !Array.isArray(atoms) || atoms.length === 0) {
            return [];
        }

        const matched = buildMatchedTopologyAtoms(previousAtoms, atoms);

        if (matched.length === 0) {
            return [];
        }

        const { previousSignal, currentSignal, regressedAtoms } = summarizeTopologySignals(matched);

        if (previousSignal === 0) {
            return [];
        }

        if (shouldSkipTopologyRegression(filePath, matched, regressedAtoms)) {
            return [];
        }

        const ratio = currentSignal / previousSignal;
        const severity = getTopologyRegressionSeverity(previousSignal, currentSignal);

        if (!severity) {
            return [];
        }

        const issueType = createIssueType(IssueDomains.ARCH, 'topology_regression', severity);
        const message = `Topology signal regressed from ${previousSignal} to ${currentSignal} after re-analysis`;

        await persistWatcherIssue(
            rootPath,
            filePath,
            issueType,
            severity,
            message,
            createStandardContext({
                guardName: 'topology-regression-guard',
                metricValue: currentSignal,
                threshold: previousSignal,
                severity,
                suggestedAction: 'Verify link extraction and caller/callee persistence before trusting downstream metrics.',
                suggestedAlternatives: [
                    StandardSuggestions.IMPACT_REVIEW,
                    'Re-run deep analysis for the file and inspect calls/calledBy extraction.',
                    'Check if parser/extractor changes removed call topology metadata.'
                ],
                extraData: {
                    previousSignal,
                    currentSignal,
                    ratio: Number(ratio.toFixed(3)),
                    regressedAtoms: regressedAtoms.slice(0, 5)
                }
            })
        );

        EventEmitterContext.emit('arch:topology-regression', {
            filePath,
            severity,
            previousSignal,
            currentSignal,
            regressedAtoms: regressedAtoms.slice(0, 5)
        });

        if (verbose) {
            logger.warn(`[TOPOLOGY] ${filePath}: signal ${previousSignal} -> ${currentSignal}`);
        }

        return [{
            issueType,
            severity,
            message,
            regressedAtoms
        }];
    } catch (error) {
        logger.debug(`[TOPOLOGY GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectTopologyRegression;
