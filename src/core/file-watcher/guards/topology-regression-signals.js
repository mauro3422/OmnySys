import { classifyFileOperationalRole } from '../../../shared/compiler/index.js';
import { isValidGuardTarget } from './guard-standards.js';

const TEST_FILE_PATTERNS = /(^|\/)(tests?|__tests__|fixtures)\//i;

function atomKey(atom) {
    return `${atom?.type || 'unknown'}::${atom?.name || 'anonymous'}`;
}

function listCount(value) {
    return Array.isArray(value) ? value.length : 0;
}

export function getTopologySignal(atom) {
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

export function buildMatchedTopologyAtoms(previousAtoms = [], atoms = []) {
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

export function summarizeTopologySignals(matched = []) {
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

export function shouldSkipTopologyRegression(filePath, matched, regressedAtoms) {
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

export function getTopologyRegressionSeverity(previousSignal, currentSignal) {
    if (currentSignal === 0 && previousSignal >= 3) {
        return 'high';
    }

    const ratio = currentSignal / previousSignal;
    if (ratio < 0.2 && (previousSignal - currentSignal) >= 3) {
        return 'medium';
    }

    return null;
}
