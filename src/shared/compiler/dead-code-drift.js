/**
 * @fileoverview Dead-code drift detection against canonical APIs.
 *
 * @module shared/compiler/dead-code-drift
 */

import { stripComments, stripStrings } from './conformance-utils.js';
import { getRecommendation } from './recommendations/RecommendationEngine.js';
import {
    MANUAL_DEAD_CODE_PATTERNS,
    CANONICAL_DEAD_CODE_RESOURCES
} from './dead-code-taxonomy.js';

export function detectDeadCodeDrift(source = '', filePath = '') {
    const findings = [];
    const sanitizedSource = stripStrings(stripComments(source));
    const hasManualLogic = MANUAL_DEAD_CODE_PATTERNS.every((pattern) => pattern.test(sanitizedSource));
    const hasCanonicalUse = CANONICAL_DEAD_CODE_RESOURCES.some((pattern) => pattern.test(sanitizedSource));
    const isDeadCodeModule = /\/dead-code-(core|reporting|utils|normalization|sql|drift)\.js$/.test(filePath);

    if (hasManualLogic && !hasCanonicalUse && !isDeadCodeModule) {
        findings.push({
            rule: 'manual_dead_code_scan',
            severity: 'medium',
            policyArea: 'dead_code',
            message: 'Manual dead-code candidate scan detected',
            recommendation: getRecommendation({ type: 'dead_code' }).message
        });
    }

    return findings;
}
