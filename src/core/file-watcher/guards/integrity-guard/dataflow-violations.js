import {
    createStandardContext,
    StandardThresholds
} from '../guard-standards.js';
import {
    buildIntegrityGuardPropagationPlan,
    summarizePropagationPlan
} from '../../../../shared/compiler/index.js';

function buildLowCoherenceViolation(atom, analysis) {
    const severity = analysis.coherence < 0.1 ? 'high' : 'medium';
    const propagation = summarizePropagationPlan(buildIntegrityGuardPropagationPlan({
        severity,
        scopePath: atom.filePath || null,
        focusPath: atom.filePath || null,
        violationCount: 1,
        impactedFileCount: 1,
        rewriteCount: 1,
        topCandidates: [{ name: atom.name, filePath: atom.filePath || null }],
        guidance: 'Route data-flow coherence violations through watcher persistence, semantic storage, and drift governance before trusting the atom graph.',
        recommendationStrategy: 'integrity_guard',
        drift: {
            state: analysis.coherence < 0.1 ? 'watch' : 'stable',
            reason: `coherence ${analysis.coherence}`
        }
    }));

    return {
        atomId: atom.id,
        atomName: atom.name,
        type: 'LOW_COHERENCE',
        severity,
        message: `Atom '${atom.name}' has low data-flow coherence (${Math.round(analysis.coherence * 100)}%). Possible broken logic.`,
        context: createStandardContext({
            guardName: 'integrity-guard',
            atomId: atom.id,
            atomName: atom.name,
            metricValue: analysis.coherence,
            threshold: StandardThresholds.COHERENCE_MIN,
            severity,
            suggestedAction: 'Review data-flow logic for disconnected inputs/outputs',
            suggestedAlternatives: [
                'Remove unused inputs',
                'Connect dangling outputs to appropriate destinations',
                'Refactor into smaller, coherent functions'
            ],
            extraData: {
                coherence: analysis.coherence,
                inputs: analysis.inputs?.length || 0,
                outputs: analysis.outputs?.length || 0,
                transformationCount: analysis.transformations?.length || 0,
                propagation
            }
        })
    };
}

function buildUnusedInputsViolation(atom, analysis, inputNames) {
    const propagation = summarizePropagationPlan(buildIntegrityGuardPropagationPlan({
        severity: 'low',
        scopePath: atom.filePath || null,
        focusPath: atom.filePath || null,
        violationCount: 1,
        impactedFileCount: 1,
        rewriteCount: inputNames.length,
        topCandidates: [{ name: atom.name, filePath: atom.filePath || null }],
        guidance: 'Route unused-input violations through watcher persistence, semantic storage, and drift governance before trusting the atom graph.',
        recommendationStrategy: 'integrity_guard',
        drift: {
            state: inputNames.length > 0 ? 'watch' : 'stable',
            reason: inputNames.length > 0 ? 'unused inputs detected' : 'no unused inputs'
        }
    }));

    return {
        atomId: atom.id,
        atomName: atom.name,
        type: 'UNUSED_INPUTS',
        severity: 'low',
        message: `Atom '${atom.name}' has unused inputs: ${inputNames.join(', ')}.`,
        context: createStandardContext({
            guardName: 'integrity-guard',
            atomId: atom.id,
            atomName: atom.name,
            severity: 'low',
            suggestedAction: 'Remove unused parameters or use them in the function logic',
            suggestedAlternatives: [
                'Remove unused parameters',
                'Use the parameters in the function body',
                'Mark optional parameters as such'
            ],
            extraData: {
                unusedInputs: inputNames,
                inputCount: analysis.inputs?.length || 0,
                propagation
            }
        })
    };
}

export {
    buildLowCoherenceViolation,
    buildUnusedInputsViolation
};
