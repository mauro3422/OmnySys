import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import { IssueDomains, createIssueType } from './guard-standards.js';
import { isTestFilePath } from './impact-wave-helpers.js';
import { countRequiredSignatureParams, extractRelatedFilePath } from '../shared/atom-relation-utils.js';
import { collectImpactWaveAtomChanges, collectImpactWaveRelatedFiles } from './impact-wave-changes.js';
import { loadImpactWaveBrokenImports, loadImpactWaveBrokenCallers } from './impact-wave-validation.js';
import { computeImpactWaveScore, summarizeImpactWave } from './impact-wave-scoring.js';
import { buildImpactWaveIssueContext } from './impact-wave-context.js';
import { clearPersistedImpactWaveIssues } from './impact-wave-persistence.js';

const logger = createLogger('OmnySys:file-watcher:guards:impact');

export async function detectImpactWave(rootPath, filePath, previousAtoms = [], EventEmitterContext, getAtomsFn, options = {}) {
    const {
        fullPath = null,
        maxAtoms = 30,
        maxRelatedFiles = 25,
        maxBrokenSamples = 5,
        relationHelpers = {}
    } = options;
    const {
        countRequiredSignatureParams: countRequiredParams = countRequiredSignatureParams,
        extractRelatedFilePath: extractRelationFile = extractRelatedFilePath
    } = relationHelpers;

    try {
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
        const { severity } = summary;

        if (!severity) {
            await clearPersistedImpactWaveIssues(rootPath, filePath);
            return null;
        }

        if (isTestFilePath(filePath) && brokenImports.length === 0 && brokenCallers.length === 0 && relatedFiles.size === 0) {
            await clearPersistedImpactWaveIssues(rootPath, filePath);
            return null;
        }

        logger.warn(
            `[IMPACT WAVE][${severity.toUpperCase()}] ${filePath}: atoms=${summary.changedAtoms}, related=${summary.relatedFiles}, brokenImports=${summary.brokenImports}, brokenCallers=${summary.brokenCallers}, score=${summary.score}`
        );

        const context = buildImpactWaveIssueContext({
            severity,
            score,
            focusedAtoms,
            focusedAtomIds,
            relatedFiles,
            brokenImports,
            brokenCallers,
            maxRelatedFiles,
            maxBrokenSamples
        });

        const issueType = createIssueType(IssueDomains.ARCH, 'impact', severity);
        await persistWatcherIssue(
            rootPath,
            filePath,
            issueType,
            severity,
            `Impact wave ${severity}: ${summary.relatedFiles} related file(s), score=${summary.score}`,
            context
        );

        if (severity !== 'high') await clearWatcherIssue(rootPath, filePath, 'arch_impact_high');
        if (severity !== 'medium') await clearWatcherIssue(rootPath, filePath, 'arch_impact_medium');
        if (severity !== 'low') await clearWatcherIssue(rootPath, filePath, 'arch_impact_low');

        EventEmitterContext.emit('arch:impact-wave', {
            filePath,
            ...summary,
            sample: context.extraData.sample
        });

        return summary;
    } catch (error) {
        logger.debug(`[IMPACT WAVE SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}
