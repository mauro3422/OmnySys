import { StandardSuggestions } from './guard-standards.js';

export function evaluateDeadCodeAtom(atom, minLines) {
    const metrics = atom.metrics;
    const normalized = atom.normalized;
    const isDead = metrics.isDeadCode || atom.isSuspiciousDeadCode;

    if (!isDead || metrics.linesOfCode < minLines) {
        return null;
    }

    const severity = metrics.linesOfCode > 20 ? 'medium' : 'low';
    const reason = normalized.isExported
        ? 'is exported but appears fully disconnected'
        : 'is not exported and has no callers/callees';

    const suggestedAction = atom.remediation.recommendedActions[0]
        || (normalized.isExported
            ? `${StandardSuggestions.DEAD_CODE_REMOVE} or verify the missing wiring/import`
            : StandardSuggestions.DEAD_CODE_REMOVE);

    return {
        atomId: metrics.id,
        atomName: metrics.name,
        severity,
        reason,
        suggestedAction,
        metrics,
        normalized,
        remediation: atom.remediation
    };
}
