import { severityFromImpact } from './guard-standards.js';

export function computeImpactWaveScore(focusedAtoms, relatedFiles, brokenImports, brokenCallers) {
    let score = 0;
    score += Math.min(focusedAtoms.length, 4);
    score += Math.min(relatedFiles.size, 8);
    if (brokenImports.length > 0) score += 8 + Math.min(brokenImports.length, 4);
    if (brokenCallers.length > 0) score += 10 + Math.min(brokenCallers.length * 2, 10);
    return score;
}

export function resolveImpactWaveSeverity(score, brokenImports, brokenCallers) {
    if (brokenImports.length > 0 || brokenCallers.length > 0) {
        return 'high';
    }

    return severityFromImpact(score);
}

export function summarizeImpactWave(focusedAtoms, relatedFiles, brokenImports, brokenCallers, score) {
    return {
        changedAtoms: focusedAtoms.length,
        relatedFiles: relatedFiles.size,
        brokenImports: brokenImports.length,
        brokenCallers: brokenCallers.length,
        score,
        severity: resolveImpactWaveSeverity(score, brokenImports, brokenCallers)
    };
}
