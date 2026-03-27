import { countRequiredSignatureParams, extractRelatedFilePath } from '../shared/atom-relation-utils.js';
import { collectImpactWaveAtomChanges, collectImpactWaveRelatedFiles } from './impact-wave-changes.js';
import { loadImpactWaveBrokenImports, loadImpactWaveBrokenCallers } from './impact-wave-validation.js';
import { computeImpactWaveScore, summarizeImpactWave } from './impact-wave-scoring.js';
import { buildImpactWaveIssueContext } from './impact-wave-context.js';
import { clearPersistedImpactWaveIssues } from './impact-wave-persistence.js';
import { isTestFilePath } from './impact-wave-helpers.js';

export async function collectImpactWaveEvidence({
    rootPath,
    filePath,
    previousAtoms = [],
    getAtomsFn,
    fullPath = null,
    maxAtoms = 30,
    maxRelatedFiles = 25,
    maxBrokenSamples = 5,
    relationHelpers = {},
    options = {}
}) {
    const {
        countRequiredSignatureParams: countRequiredParams = countRequiredSignatureParams,
        extractRelatedFilePath: extractRelationFile = extractRelatedFilePath
    } = relationHelpers;

    const currentAtoms = options.atoms || await getAtomsFn(filePath);
    if (!currentAtoms || currentAtoms.length === 0) {
        await clearPersistedImpactWaveIssues(rootPath, filePath);
        return null;
    }

    const { validateImportsInEdit, validatePostEditOptimized } = await import('#layer-c/mcp/tools/atomic-edit/validators.js');
    const changedAtoms = collectImpactWaveAtomChanges(previousAtoms, currentAtoms, countRequiredParams);

    const focusedAtoms = changedAtoms.slice(0, maxAtoms);
    const focusedAtomNames = new Set(focusedAtoms.map((atom) => atom.name));
    const focusedAtomIds = focusedAtoms.map((atom) => atom.id).filter(Boolean);
    const relatedFiles = collectImpactWaveRelatedFiles(currentAtoms, focusedAtomNames, filePath, extractRelationFile);
    const brokenImports = await loadImpactWaveBrokenImports(fullPath, filePath, rootPath, validateImportsInEdit);
    const brokenCallers = await loadImpactWaveBrokenCallers({
        filePath,
        rootPath,
        previousAtoms,
        currentAtoms,
        changedAtoms,
        validatePostEditOptimized
    });
    const score = computeImpactWaveScore(focusedAtoms, relatedFiles, brokenImports, brokenCallers);
    const summary = summarizeImpactWave(
        focusedAtoms,
        new Set(Array.from(relatedFiles).slice(0, maxRelatedFiles)),
        brokenImports,
        brokenCallers,
        score
    );

    if (!summary.severity) {
        await clearPersistedImpactWaveIssues(rootPath, filePath);
        return null;
    }

    if (isTestFilePath(filePath) && brokenImports.length === 0 && brokenCallers.length === 0 && relatedFiles.size === 0) {
        await clearPersistedImpactWaveIssues(rootPath, filePath);
        return null;
    }

    return {
        severity: summary.severity,
        score,
        focusedAtoms,
        focusedAtomIds,
        relatedFiles,
        brokenImports,
        brokenCallers,
        summary,
        issueContext: buildImpactWaveIssueContext({
            severity: summary.severity,
            score,
            focusedAtoms,
            focusedAtomIds,
            relatedFiles,
            brokenImports,
            brokenCallers,
            maxRelatedFiles,
            maxBrokenSamples
        })
    };
}
