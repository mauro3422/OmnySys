import {
    classifyConceptualNoise,
    classifyContractSurface,
    evaluateContractCompatibility,
    shouldIgnoreConceptualDuplicateFinding
} from '../../../shared/compiler/index.js';

function loadContractSurface(atomLike) {
    return classifyContractSurface({
        filePath: atomLike.filePath || atomLike.file_path,
        purposeType: atomLike.purposeType || atomLike.purpose_type,
        isExported: atomLike.isExported ?? atomLike.is_exported
    });
}

function isNonCompetingLocalRole(purposeType) {
    return purposeType === 'TEST_HELPER' || purposeType === 'ANALYSIS_SCRIPT';
}

function isProductionApiRole(atom) {
    return atom?.purposeType === 'API_EXPORT' || atom?.isExported;
}

export function shouldSkipConceptualAtom(normalizedFilePath, localAtom, isLowSignalNameFn) {
    if (
        localAtom.purposeType === 'REMOVED' ||
        localAtom.purposeType === 'WRAPPER' ||
        localAtom.purposeType === 'TEST_HELPER' ||
        localAtom.purposeType === 'ANALYSIS_SCRIPT'
    ) {
        return true;
    }

    if (isLowSignalNameFn(localAtom.name)) {
        return true;
    }

    const fingerprint = localAtom.semanticFingerprint;
    if (classifyConceptualNoise(fingerprint, localAtom.name) !== 'actionable') {
        return true;
    }

    if (
        fingerprint.includes(':unknown') ||
        fingerprint.includes(':_callback') ||
        fingerprint.includes(':constructor')
    ) {
        return true;
    }

    return shouldIgnoreConceptualDuplicateFinding(normalizedFilePath, localAtom.name, fingerprint);
}

export function isActionableConceptualPeer(localAtom, duplicate) {
    if (!duplicate) {
        return false;
    }

    const compatibility = evaluateContractCompatibility(
        loadContractSurface(localAtom),
        loadContractSurface(duplicate)
    );

    if (!compatibility.compatible) {
        return false;
    }

    if (isNonCompetingLocalRole(localAtom.purposeType)) {
        return duplicate.purpose_type === localAtom.purposeType;
    }

    if (isNonCompetingLocalRole(duplicate.purpose_type)) {
        return false;
    }

    if (
        duplicate.purpose_type === 'CLASS_METHOD' &&
        !duplicate.is_exported &&
        isProductionApiRole(localAtom)
    ) {
        return false;
    }

    if (
        localAtom.purposeType === 'CLASS_METHOD' &&
        !localAtom.isExported &&
        isProductionApiRole({
            purposeType: duplicate.purpose_type,
            isExported: duplicate.is_exported
        })
    ) {
        return false;
    }

    return true;
}

export function isTrivialCanonicalDelegate(localAtom, structuralVariants) {
    if (!localAtom?.isExported || Number(localAtom.linesOfCode) > 3) {
        return false;
    }

    return structuralVariants.some((duplicate) => (
        duplicate.is_exported &&
        duplicate.purpose_type !== 'REMOVED' &&
        duplicate.purpose_type !== 'WRAPPER' &&
        (
            duplicate.name === localAtom.name ||
            Number(duplicate.lines_of_code) >= Number(localAtom.linesOfCode) + 3
        )
    ));
}
