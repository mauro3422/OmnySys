import { summarizeDerivedScoreCoverage } from '../../../../shared/compiler/index.js';
import { evaluateGuardTargetTestability, isValidGuardTarget } from '../guard-standards.js';

function isMetadataGuardExemptPath(filePath = '') {
    const normalizedPath = String(filePath || '').replace(/\\/g, '/');
    return normalizedPath.startsWith('src/core/file-watcher/guards/')
        || normalizedPath.includes('/metadata-completeness/')
        || normalizedPath.startsWith('src/shared/compiler/')
        || normalizedPath.includes('/conformance')
        || normalizedPath.startsWith('src/layer-a-static/pipeline/phases/atom-extraction/builders/');
}

export function loadMetadataCompletenessEvidence(atoms = [], filePath) {
    if (!Array.isArray(atoms) || atoms.length === 0) {
        return null;
    }

    if (isMetadataGuardExemptPath(filePath)) {
        return null;
    }

    const coverage = summarizeDerivedScoreCoverage(atoms, { filePath });
    const candidates = coverage.candidates.filter(isValidGuardTarget);

    if (candidates.length === 0) {
        return null;
    }

    const missingAtoms = coverage.missingAtoms.filter(isValidGuardTarget);

    if (missingAtoms.length === 0) {
        return null;
    }

    const ratio = coverage.missingRatio;
    const hasHighSignalAtom = missingAtoms.some((atom) => {
        return evaluateGuardTargetTestability(atom).isHighSignal;
    });

    let severity = null;
    if (ratio >= 1 && (candidates.length >= 2 || hasHighSignalAtom)) severity = 'high';
    else if (ratio >= 0.5) severity = 'medium';

    if (!severity) {
        return null;
    }

    return {
        candidateAtoms: candidates.length,
        missingAtoms: missingAtoms.length,
        missingRatio: Number(ratio.toFixed(3)),
        sampleAtoms: coverage.sampleAtoms,
        severity
    };
}
