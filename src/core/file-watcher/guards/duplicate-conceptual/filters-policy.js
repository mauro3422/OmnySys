import { classifyConceptualNoise, shouldIgnoreConceptualDuplicateFinding } from '../../../../shared/compiler/index.js';

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
