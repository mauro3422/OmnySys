import { getActionableUnusedInputs } from '../../../../shared/compiler/index.js';
import { getAtomDataFlowContext } from './dataflow-context.js';
import { shouldSkipDataFlowViolation } from './dataflow-skip.js';
import {
    buildLowCoherenceViolation,
    buildUnusedInputsViolation
} from './dataflow-violations.js';

export function analyzeAtomDataFlow(atom) {
    const flowContext = getAtomDataFlowContext(atom);
    if (!flowContext) {
        return [];
    }

    const { analysis, role, fileRole, isInfrastructureLeafAtom } = flowContext;
    const violations = [];
    const resolvedRole = role.role === 'standard' ? fileRole : role;
    const inputsCount = analysis.inputs?.length || 0;
    const outputsCount = analysis.outputs?.length || 0;
    const transformationCount = analysis.transformations?.length || 0;

    if (!shouldSkipDataFlowViolation(atom, resolvedRole, inputsCount, outputsCount, transformationCount, isInfrastructureLeafAtom) &&
        analysis.coherence < 0.1) {
        violations.push(buildLowCoherenceViolation(atom, analysis));
    }

    const inputNames = getActionableUnusedInputs(analysis);
    if (inputNames.length > 0) {
        violations.push(buildUnusedInputsViolation(atom, analysis, inputNames));
    }

    return violations;
}
