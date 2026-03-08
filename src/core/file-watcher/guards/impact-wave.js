import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
import {
    IssueDomains,
    createIssueType,
    createStandardContext,
    StandardThresholds,
    StandardSuggestions,
    severityFromImpact
} from './guard-standards.js';
import { safeArray } from '../../../shared/compiler/index.js';
import { countRequiredSignatureParams, extractRelatedFilePath } from '../shared/atom-relation-utils.js';

const logger = createLogger('OmnySys:file-watcher:guards:impact');

/**
 * Detecta ola de impacto de cambios
 * @param {string} rootPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo analizado
 * @param {Array<Object>} previousAtoms - Átomos previos
 * @param {Object} EventEmitterContext - Contexto para emitir eventos
 * @param {Function} getAtomsFn - Función para obtener átomos
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Object|null>} Resultado del análisis
 */
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
            await clearWatcherIssue(rootPath, filePath, 'arch_impact_high');
            await clearWatcherIssue(rootPath, filePath, 'arch_impact_medium');
            await clearWatcherIssue(rootPath, filePath, 'arch_impact_low');
            return null;
        }

        const { validateImportsInEdit, validatePostEditOptimized } = await import('#layer-c/mcp/tools/atomic-edit/validators.js');
        const fs = await import('fs/promises');

        const previousByName = new Map(previousAtoms.map(a => [a.name, a]));
        const changedAtoms = [];

        for (const atom of currentAtoms) {
            const prev = previousByName.get(atom.name);
            if (!prev) {
                changedAtoms.push({ id: atom.id, name: atom.name, type: 'added' });
                continue;
            }

            const prevRequired = countRequiredParams(prev);
            const currRequired = countRequiredParams(atom);
            if (prevRequired !== currRequired) {
                changedAtoms.push({ id: atom.id, name: atom.name, type: 'signature' });
            }
        }

        for (const prev of previousAtoms) {
            const stillExists = currentAtoms.some(a => a.name === prev.name);
            if (!stillExists) {
                changedAtoms.push({ id: prev.id, name: prev.name, type: 'removed' });
            }
        }

        const focusedAtoms = changedAtoms.slice(0, maxAtoms);
        const focusedAtomNames = new Set(focusedAtoms.map(a => a.name));
        const focusedAtomIds = focusedAtoms.map(a => a.id).filter(Boolean);

        const relatedFiles = new Set();
        for (const atom of currentAtoms) {
            if (!focusedAtomNames.has(atom.name)) continue;

            for (const rel of safeArray(atom.calledBy)) {
                const relFile = extractRelationFile(rel);
                if (relFile && relFile !== filePath) relatedFiles.add(relFile);
            }
            for (const rel of safeArray(atom.calls)) {
                const relFile = extractRelationFile(rel);
                if (relFile && relFile !== filePath) relatedFiles.add(relFile);
            }
        }

        let brokenImports = [];
        if (fullPath) {
            try {
                const code = await fs.readFile(fullPath, 'utf-8');
                brokenImports = await validateImportsInEdit(filePath, code, rootPath);
            } catch {
                brokenImports = [];
            }
        }

        const postValidation = await validatePostEditOptimized(filePath, rootPath, previousAtoms, currentAtoms);
        const brokenCallers = safeArray(postValidation?.brokenCallers);

        let score = 0;
        score += Math.min(focusedAtoms.length, 4);
        score += Math.min(relatedFiles.size, 8);
        if (brokenImports.length > 0) score += 8 + Math.min(brokenImports.length, 4);
        if (brokenCallers.length > 0) score += 10 + Math.min(brokenCallers.length * 2, 10);

        const severity = severityFromImpact(score);
        if (!severity) {
            await clearWatcherIssue(rootPath, filePath, 'arch_impact_high');
            await clearWatcherIssue(rootPath, filePath, 'arch_impact_medium');
            await clearWatcherIssue(rootPath, filePath, 'arch_impact_low');
            return null;
        }

        const summary = {
            changedAtoms: focusedAtoms.length,
            relatedFiles: Math.min(relatedFiles.size, maxRelatedFiles),
            brokenImports: brokenImports.length,
            brokenCallers: brokenCallers.length,
            score,
            severity
        };

        logger.warn(
            `[IMPACT WAVE][${severity.toUpperCase()}] ${filePath}: atoms=${summary.changedAtoms}, related=${summary.relatedFiles}, brokenImports=${summary.brokenImports}, brokenCallers=${summary.brokenCallers}, score=${summary.score}`
        );

        // Crear contexto estandarizado
        const hasBreakingChanges = brokenCallers.length > 0 || brokenImports.length > 0;
        const context = createStandardContext({
            guardName: 'impact-wave-guard',
            severity,
            metricValue: score,
            threshold: severity === 'high' ? StandardThresholds.IMPACT_HIGH :
                (severity === 'medium' ? StandardThresholds.IMPACT_MEDIUM : StandardThresholds.IMPACT_LOW),
            suggestedAction: hasBreakingChanges
                ? StandardSuggestions.IMPACT_BREAKING
                : StandardSuggestions.IMPACT_REVIEW,
            suggestedAlternatives: hasBreakingChanges ? [
                'Add backward compatibility layer',
                'Update all callers before deploying',
                'Use atomic_edit to fix broken callers'
            ] : [
                'Review changes in related files',
                'Run integration tests',
                'Check for unexpected side effects'
            ],
            relatedFiles: Array.from(relatedFiles).slice(0, maxRelatedFiles),
            extraData: {
                score,
                changedAtoms: focusedAtoms.length,
                changedAtomIds: focusedAtomIds,
                relatedFiles: Math.min(relatedFiles.size, maxRelatedFiles),
                brokenImports: brokenImports.length,
                brokenCallers: brokenCallers.length,
                sample: {
                    atoms: focusedAtoms.slice(0, 8),
                    relatedFiles: Array.from(relatedFiles).slice(0, maxRelatedFiles),
                    brokenImports: brokenImports.slice(0, maxBrokenSamples).map(i => i.import),
                    brokenCallers: brokenCallers.slice(0, maxBrokenSamples).map(c => ({
                        file: c.file,
                        line: c.line,
                        symbol: c.symbol || c.name || null
                    }))
                }
            }
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

        // Limpiar severidades que no aplican
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

export default detectImpactWave;
