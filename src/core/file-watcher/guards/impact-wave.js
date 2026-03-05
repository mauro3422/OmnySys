import { persistWatcherIssue, clearWatcherIssue } from '../watcher-issue-persistence.js';
import { createLogger } from '../../../utils/logger.js';
const logger = createLogger('OmnySys:file-watcher:guards:impact');

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function getRequiredParamsCount(atom) {
    return safeArray(atom?.signature?.params).filter(p => !p?.optional).length;
}

function getFileFromRelationEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
        if (entry.includes('::')) return entry.split('::')[0];
        return null;
    }

    const direct = entry.filePath || entry.file || entry.targetFile || entry.sourcePath || entry.targetPath;
    if (direct && typeof direct === 'string') return direct;

    const id = entry.id || entry.atomId || entry.targetId || entry.sourceId;
    if (id && typeof id === 'string' && id.includes('::')) return id.split('::')[0];

    return null;
}

function impactLevelFromScore(score) {
    if (score >= 18) return 'high';
    if (score >= 10) return 'medium';
    if (score >= 4) return 'low';
    return 'none';
}

/**
 * Simula una "ola de impacto" local tras cambios de archivo.
 * Señala riesgo sin bloquear, para aparecer en _recentErrors en la siguiente tool call.
 */
export async function detectImpactWave(rootPath, filePath, previousAtoms = [], EventEmitterContext, getAtomsFn, options = {}) {
    const {
        fullPath = null,
        maxAtoms = 30,
        maxRelatedFiles = 25,
        maxBrokenSamples = 5
    } = options;

    try {
        const currentAtoms = options.atoms || await getAtomsFn(filePath);
        if (!currentAtoms || currentAtoms.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'watcher_impact_wave');
            return null;
        }

        const { validateImportsInEdit, validatePostEditOptimized } = await import('#layer-c/mcp/tools/atomic-edit/validators.js');
        const fs = await import('fs/promises');

        const previousByName = new Map(previousAtoms.map(a => [a.name, a]));
        const changedAtoms = [];

        for (const atom of currentAtoms) {
            const prev = previousByName.get(atom.name);
            if (!prev) {
                changedAtoms.push({ name: atom.name, type: 'added' });
                continue;
            }

            const prevRequired = getRequiredParamsCount(prev);
            const currRequired = getRequiredParamsCount(atom);
            if (prevRequired !== currRequired) {
                changedAtoms.push({ name: atom.name, type: 'signature' });
            }
        }

        for (const prev of previousAtoms) {
            const stillExists = currentAtoms.some(a => a.name === prev.name);
            if (!stillExists) {
                changedAtoms.push({ name: prev.name, type: 'removed' });
            }
        }

        const focusedAtoms = changedAtoms.slice(0, maxAtoms);
        const focusedAtomNames = new Set(focusedAtoms.map(a => a.name));

        const relatedFiles = new Set();
        for (const atom of currentAtoms) {
            if (!focusedAtomNames.has(atom.name)) continue;

            for (const rel of safeArray(atom.calledBy)) {
                const relFile = getFileFromRelationEntry(rel);
                if (relFile && relFile !== filePath) relatedFiles.add(relFile);
            }
            for (const rel of safeArray(atom.calls)) {
                const relFile = getFileFromRelationEntry(rel);
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

        const level = impactLevelFromScore(score);
        if (level === 'none') {
            await clearWatcherIssue(rootPath, filePath, 'watcher_impact_wave');
            return null;
        }

        const summary = {
            changedAtoms: focusedAtoms.length,
            relatedFiles: Math.min(relatedFiles.size, maxRelatedFiles),
            brokenImports: brokenImports.length,
            brokenCallers: brokenCallers.length,
            score,
            level
        };

        logger.warn(
            `[IMPACT WAVE][${level.toUpperCase()}] ${filePath}: atoms=${summary.changedAtoms}, relatedFiles=${summary.relatedFiles}, brokenImports=${summary.brokenImports}, brokenCallers=${summary.brokenCallers}, score=${summary.score}`
        );

        if (brokenCallers.length > 0) {
            const sample = brokenCallers.slice(0, maxBrokenSamples).map(c => `${c.file}:${c.line}`).join(', ');
            logger.warn(`[IMPACT WAVE] Broken caller sample: ${sample}`);
        }

        if (brokenImports.length > 0) {
            const sample = brokenImports.slice(0, maxBrokenSamples).map(i => i.import).join(', ');
            logger.warn(`[IMPACT WAVE] Broken import sample: ${sample}`);
        }

        EventEmitterContext.emit('impact:wave', {
            filePath,
            ...summary,
            sample: {
                atoms: focusedAtoms.slice(0, 8),
                relatedFiles: Array.from(relatedFiles).slice(0, maxRelatedFiles),
                brokenImports: brokenImports.slice(0, maxBrokenSamples),
                brokenCallers: brokenCallers.slice(0, maxBrokenSamples)
            }
        });

        await persistWatcherIssue(
            rootPath,
            filePath,
            'watcher_impact_wave',
            level,
            `Impact wave ${level} (score=${summary.score}, relatedFiles=${summary.relatedFiles})`,
            {
                score: summary.score,
                changedAtoms: summary.changedAtoms,
                relatedFiles: summary.relatedFiles,
                brokenImports: summary.brokenImports,
                brokenCallers: summary.brokenCallers,
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
        );

        return summary;
    } catch (error) {
        logger.debug(`[IMPACT WAVE SKIP] ${filePath}: ${error.message}`);
        return null;
    }
}
