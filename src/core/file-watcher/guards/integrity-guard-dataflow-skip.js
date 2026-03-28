import { isLikelyBoundaryContainerAtom } from '../../../shared/compiler/index.js';

export function shouldSkipDataFlowViolation(atom, resolvedRole, inputsCount, outputsCount, transformationCount, isInfrastructureLeafAtom) {
    const isEmptyFlow = inputsCount === 0 && outputsCount === 0 && transformationCount === 0;
    const isCoordinatorLike = (
        resolvedRole.role === 'orchestrator' ||
        resolvedRole.role === 'resolver' ||
        resolvedRole.role === 'builder' ||
        resolvedRole.role === 'analyzer' ||
        resolvedRole.role === 'bridge' ||
        resolvedRole.role === 'policy'
    );

    return (isLikelyBoundaryContainerAtom(atom) && isEmptyFlow) ||
        (isCoordinatorLike && isEmptyFlow) ||
        isInfrastructureLeafAtom(isEmptyFlow);
}
