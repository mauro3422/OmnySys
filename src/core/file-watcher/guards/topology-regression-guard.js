/**
 * Detects abrupt loss of call topology after a file change.
 */

import { createLogger } from '../../../utils/logger.js';
import { clearWatcherIssue } from '../watcher-issue-persistence.js';
import { persistTopologyRegressionFinding } from './topology-regression-reporting.js';
import {
    buildMatchedTopologyAtoms,
    summarizeTopologySignals,
    shouldSkipTopologyRegression,
    getTopologyRegressionSeverity
} from './topology-regression-signals.js';

const logger = createLogger('OmnySys:file-watcher:guards:topology-regression');

export async function detectTopologyRegression(rootPath, filePath, EventEmitterContext, options = {}) {
    const { previousAtoms = [], atoms = [], verbose = true } = options;

    try {
        await clearWatcherIssue(rootPath, filePath, 'arch_topology_regression_high');
        await clearWatcherIssue(rootPath, filePath, 'arch_topology_regression_medium');

        if (!Array.isArray(previousAtoms) || previousAtoms.length === 0 || !Array.isArray(atoms) || atoms.length === 0) {
            return [];
        }

        const matched = buildMatchedTopologyAtoms(previousAtoms, atoms);

        if (matched.length === 0) {
            return [];
        }

        const { previousSignal, currentSignal, regressedAtoms } = summarizeTopologySignals(matched);

        if (previousSignal === 0) {
            return [];
        }

        if (shouldSkipTopologyRegression(filePath, matched, regressedAtoms)) {
            return [];
        }

        const ratio = currentSignal / previousSignal;
        const severity = getTopologyRegressionSeverity(previousSignal, currentSignal);

        if (!severity) {
            return [];
        }

        const finding = await persistTopologyRegressionFinding({
            rootPath,
            filePath,
            severity,
            previousSignal,
            currentSignal,
            ratio,
            regressedAtoms,
            EventEmitterContext
        });

        if (verbose) {
            logger.warn(`[TOPOLOGY] ${filePath}: signal ${previousSignal} -> ${currentSignal}`);
        }

        return [finding];
    } catch (error) {
        logger.debug(`[TOPOLOGY GUARD SKIP] ${filePath}: ${error.message}`);
        return [];
    }
}

export default detectTopologyRegression;
