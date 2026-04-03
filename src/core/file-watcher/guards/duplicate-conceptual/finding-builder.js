import {
    generateAlternativeNames,
    classifyUtilityHelperDuplicate,
    summarizeAtomTestability
} from '../../../../shared/compiler/index.js';

export function buildConceptualFinding(localAtom, structuralVariants, testabilitySeverity = 'low') {
    const uniqueFiles = [...new Set(structuralVariants.map((duplicate) => duplicate.file_path))];
    const utilityHelperInfo = classifyUtilityHelperDuplicate(
        localAtom.filePath,
        localAtom.name,
        localAtom.semanticFingerprint
    );
    const testabilitySummary = summarizeAtomTestability([localAtom]);

    const finding = {
        symbol: localAtom.name,
        atomId: localAtom.id,
        semanticFingerprint: localAtom.semanticFingerprint,
        duplicateType: 'CONCEPTUAL_DUPLICATE',
        totalInstances: structuralVariants.length + 1,
        duplicateFiles: uniqueFiles,
        duplicateNames: [...new Set(structuralVariants.map((duplicate) => duplicate.name))],
        sample: uniqueFiles.slice(0, 3),
        isExported: localAtom.isExported,
        existingExports: structuralVariants.filter((duplicate) => duplicate.is_exported).length,
        testabilitySeverity: testabilitySummary?.severity || testabilitySeverity,
        suggestedAlternatives: generateAlternativeNames(localAtom.name, structuralVariants[0]?.name)
    };

    if (utilityHelperInfo.isUtilityHelper) {
        finding.isUtilityHelper = true;
        finding.utilityHelperReason = utilityHelperInfo.reason;
        if (utilityHelperInfo.suggestedLocation) {
            finding.suggestedConsolidationLocation = utilityHelperInfo.suggestedLocation;
        }
    }

    return finding;
}
