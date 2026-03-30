import { createLogger } from '../../../../utils/logger.js';
import { extractAtomMetrics, isValidGuardTarget } from '../guard-standards.js';
import { buildDeadCodeRemediation, isSuspiciousDeadCodeAtom, normalizeDeadCodeAtom } from '../../../../shared/compiler/index.js';
import { evaluateDeadCodeAtom } from './evaluation.js';
import { buildDeadCodeIssue, buildDeadCodeEventPayload } from './issues.js';
import { clearPersistedDeadCodeIssues, persistDeadCodeIssues } from './persistence.js';

const logger = createLogger('OmnySys:file-watcher:guards:dead-code');

function prepareDeadCodeAtom(atom, minLines) {
    const metrics = extractAtomMetrics(atom);
    const normalized = normalizeDeadCodeAtom(atom);
    const remediation = buildDeadCodeRemediation(atom);
    const isSuspiciousDeadCode = isSuspiciousDeadCodeAtom(atom, { minLines });

    return {
        metrics,
        normalized,
        remediation,
        isSuspiciousDeadCode
    };
}

export async function detectDeadCode(rootPath, filePath, EventEmitterContext, atoms = [], options = {}) {
    const {
        minLines = 5,
        verbose = true
    } = options;

    try {
        if (!atoms || atoms.length === 0) {
            await clearPersistedDeadCodeIssues(rootPath, filePath);
            return [];
        }

        const issues = [];

        for (const atom of atoms) {
            if (!isValidGuardTarget(atom)) continue;

            const prepared = prepareDeadCodeAtom(atom, minLines);
            const evaluation = evaluateDeadCodeAtom(prepared, minLines);
            if (!evaluation) continue;

            issues.push(buildDeadCodeIssue(evaluation, minLines));
        }

        if (issues.length > 0) {
            await persistDeadCodeIssues(rootPath, filePath, issues);

            EventEmitterContext.emit('code:dead-code', buildDeadCodeEventPayload(filePath, issues));

            if (verbose) {
                const totalLines = issues.reduce((sum, issue) => sum + issue.context.extraData.linesOfCode, 0);
                logger.warn(`[DEAD-CODE] ${filePath}: ${issues.length} dead function(s), ${totalLines} lines total`);
            }
        } else {
            await clearPersistedDeadCodeIssues(rootPath, filePath);
        }

        return issues;
    } catch (error) {
        logger.debug(`[DEAD-CODE GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}
