import {
    createStandardContext,
    StandardThresholds
} from './guard-standards.js';

function buildLowCoherenceViolation(atom, analysis) {
    const severity = analysis.coherence < 0.1 ? 'high' : 'medium';

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
                transformationCount: analysis.transformations?.length || 0
            }
        })
    };
}

function buildUnusedInputsViolation(atom, analysis, inputNames) {
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
                inputCount: analysis.inputs?.length || 0
            }
        })
    };
}

export {
    buildLowCoherenceViolation,
    buildUnusedInputsViolation
};
