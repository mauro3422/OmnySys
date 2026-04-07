import { isLikelyBoundaryContainerAtom } from '../../../../shared/compiler/index.js';

function isLikelyDelegationWrapperAtom(atom) {
    const name = String(atom?.name || '');
    const filePath = String(atom?.file_path || atom?.filePath || '').replace(/\\/g, '/').toLowerCase();
    const atomType = String(atom?.type || atom?.functionType || '').toLowerCase();
    const semanticFingerprint = String(
        atom?.semanticFingerprint
        || atom?.dna?.semanticFingerprint
        || atom?.dnaJson?.semanticFingerprint
        || ''
    ).toLowerCase();

    // Logger/Logger-like classes are intentionally delegation wrappers
    const isLoggerClass = atomType === 'class' && /logger/i.test(name);

    // Operation classes (ModifyOperation, InsertOperation, etc.) are intentionally coordinators
    const isOperationClass = atomType === 'class' && /Operation$/.test(name);

    // Wrapper/adapter classes by naming convention
    const isWrapperByNaming = /(Logger|Operation|Factory|Adapter|Wrapper|Handler|Proxy|Bridge)$/.test(name);

    // Semantic fingerprints that indicate delegation
    const isDelegationByFingerprint = semanticFingerprint.startsWith('process:logic:core:');

    // Known infrastructure paths where delegation is the design pattern
    const isDelegationByPath = /\/(logger|operations|adapters|wrappers)\//.test(filePath);

    return isLoggerClass ||
        isOperationClass ||
        isWrapperByNaming ||
        isDelegationByFingerprint ||
        isDelegationByPath;
}

export function shouldSkipDataFlowViolation(atom, resolvedRole, inputsCount, outputsCount, transformationCount, isInfrastructureLeafAtom) {
    const isEmptyFlow = inputsCount === 0 && outputsCount === 0 && transformationCount === 0;
    const isCoordinatorLike = (
        resolvedRole.role === 'orchestrator' ||
        resolvedRole.role === 'resolver' ||
        resolvedRole.role === 'builder' ||
        resolvedRole.role === 'analyzer' ||
        resolvedRole.role === 'bridge' ||
        resolvedRole.role === 'policy' ||
        resolvedRole.role === 'wrapper' ||
        resolvedRole.role === 'adapter'
    );

    return (isLikelyBoundaryContainerAtom(atom) && isEmptyFlow) ||
        (isCoordinatorLike && isEmptyFlow) ||
        (isLikelyDelegationWrapperAtom(atom) && isEmptyFlow) ||
        isInfrastructureLeafAtom(isEmptyFlow);
}
