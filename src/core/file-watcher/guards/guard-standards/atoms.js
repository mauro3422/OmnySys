import { evaluateAtomTestability } from '../../../../shared/compiler/index.js';

const LOW_SIGNAL_PATTERNS = [
    /^anonymous(_\d+)?$/i,
    /^.*_callback$/i,
    /_arg\d+$/i,
    /^(then|catch|map|filter|some|reduce)_callback$/i
];

export function isValidGuardTarget(atom) {
    if (!atom) return false;

    const validTypes = ['function', 'method', 'arrow', 'class'];
    if (!validTypes.includes(atom.type)) return false;
    if (atom.isDeadCode || atom.isRemoved) return false;
    if (isLowSignalName(atom.name)) return false;

    return true;
}

export function isLowSignalName(name) {
    if (!name) return true;
    return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(name));
}

export function extractAtomMetrics(atom) {
    const {
        id,
        name,
        type,
        atom_type,
        complexity,
        linesOfCode,
        lines_of_code,
        isAsync,
        is_async,
        isExported,
        is_exported,
        hasErrorHandling,
        has_error_handling,
        hasNetworkCalls,
        has_network_calls,
        sharedStateAccess,
        shared_state_json,
        eventEmitters,
        event_emitters_json,
        eventListeners,
        event_listeners_json,
        changeFrequency,
        change_frequency,
        ageDays,
        age_days,
        fragilityScore,
        fragility_score,
        riskLevel,
        risk_level,
        isDeadCode,
        is_dead_code
    } = atom || {};

    return {
        id,
        name,
        type: type ?? atom_type,
        complexity: complexity ?? 1,
        linesOfCode: linesOfCode ?? lines_of_code ?? 0,
        isAsync: isAsync ?? is_async ?? false,
        isExported: isExported ?? is_exported ?? false,
        hasErrorHandling: hasErrorHandling ?? has_error_handling ?? false,
        hasNetworkCalls: hasNetworkCalls ?? has_network_calls ?? false,
        sharedStateAccess: sharedStateAccess ?? shared_state_json ?? [],
        eventEmitters: eventEmitters ?? event_emitters_json ?? [],
        eventListeners: eventListeners ?? event_listeners_json ?? [],
        changeFrequency: changeFrequency ?? change_frequency ?? 0,
        ageDays: ageDays ?? age_days ?? 0,
        fragilityScore: fragilityScore ?? fragility_score ?? 0,
        riskLevel: riskLevel ?? risk_level ?? 'LOW',
        isDeadCode: isDeadCode ?? is_dead_code ?? false
    };
}

export function evaluateGuardTargetTestability(atom) {
    const evaluation = evaluateAtomTestability(atom);
    return {
        ...evaluation,
        isHighSignal: evaluation.score <= 69 || evaluation.signals.isAsync || evaluation.signals.isExported
    };
}
