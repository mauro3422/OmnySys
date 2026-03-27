import { classifyContractSurface, evaluateContractCompatibility } from '../../../shared/compiler/index.js';

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
