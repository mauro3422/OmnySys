/**
 * @fileoverview guard-standards.js
 *
 * Surface canónica compartida por los guards del FileWatcher.
 * Reexporta thresholds, context builders, utilidades de átomos, mensajes
 * y sugerencias sin romper imports existentes.
 *
 * @module core/file-watcher/guards/guard-standards
 * @version 2.1.0
 */

import { createLogger } from '../../../utils/logger.js';
import * as thresholds from './guard-standards/thresholds.js';
import * as atoms from './guard-standards/atoms.js';
import * as messages from './guard-standards/messages.js';
import { createStandardContext } from './guard-standards/context.js';
import { StandardSuggestions } from './guard-standards/suggestions.js';

const logger = createLogger('OmnySys:guards:standards');

export function validateGuard(guard) {
    const errors = [];

    if (!guard.name) errors.push('Guard must have a name');
    if (!guard.version) errors.push('Guard should have a version');
    if (!guard.domain) errors.push('Guard should specify a domain (use IssueDomains)');
    if (typeof guard.detect !== 'function') errors.push('Guard must have a detect function');

    return {
        valid: errors.length === 0,
        errors
    };
}

export {
    StandardSuggestions,
    createStandardContext,
};
export {
    IssueDomains,
    IssueSeverity,
    StandardThresholds,
    createIssueType,
    severityFromComplexity,
    severityFromLines,
    severityFromFileLines,
    severityFromImpact,
    severityFromSharedState
} from './guard-standards/thresholds.js';
export {
    isValidGuardTarget,
    isLowSignalName,
    extractAtomMetrics,
    evaluateGuardTargetTestability
} from './guard-standards/atoms.js';
export {
    formatDuplicateMessage,
    formatImpactMessage,
    formatAsyncSafetyMessage,
    formatEventLeakMessage
} from './guard-standards/messages.js';

export default {
    logger,
    IssueDomains: thresholds.IssueDomains,
    IssueSeverity: thresholds.IssueSeverity,
    StandardThresholds: thresholds.StandardThresholds,
    StandardSuggestions,
    createIssueType: thresholds.createIssueType,
    createStandardContext,
    severityFromComplexity: thresholds.severityFromComplexity,
    severityFromLines: thresholds.severityFromLines,
    severityFromFileLines: thresholds.severityFromFileLines,
    severityFromImpact: thresholds.severityFromImpact,
    severityFromSharedState: thresholds.severityFromSharedState,
    isValidGuardTarget: atoms.isValidGuardTarget,
    isLowSignalName: atoms.isLowSignalName,
    extractAtomMetrics: atoms.extractAtomMetrics,
    evaluateGuardTargetTestability: atoms.evaluateGuardTargetTestability,
    formatDuplicateMessage: messages.formatDuplicateMessage,
    formatImpactMessage: messages.formatImpactMessage,
    formatAsyncSafetyMessage: messages.formatAsyncSafetyMessage,
    formatEventLeakMessage: messages.formatEventLeakMessage,
    validateGuard
};
