/**
 * @fileoverview UrlValidator.js
 * 
 * Validates API URLs for suspicious patterns.
 * 
 * @module analyses/tier3/validators/UrlValidator
 */

import { groupByFile } from '../utils/issue-utils.js';

const suspiciousPatterns = [
  { pattern: /localhost/, reason: 'Hardcoded localhost URL' },
  { pattern: /127\.0\.0\.1/, reason: 'Hardcoded IP address' },
  { pattern: /example\.com/, reason: 'Example domain in production code' },
  { pattern: /\.dev\./, reason: 'Development environment URL' },
  { pattern: /\/\/.*:\d+\//, reason: 'Hardcoded port number' }
];

/**
 * Validates URLs for suspicious patterns
 */
export class UrlValidator {
  validate(advancedAnalysis) {
    const suspiciousUrls = [];
    const fileResults = advancedAnalysis?.fileResults || {};

    for (const [filePath, analysis] of Object.entries(fileResults)) {
      const networkUrls = analysis.networkCalls?.urls || [];
      const wsUrls = analysis.webSocket?.urls || [];
      const allUrls = [...networkUrls, ...wsUrls];

      for (const urlInfo of allUrls) {
        for (const { pattern, reason } of suspiciousPatterns) {
          if (pattern.test(urlInfo.url)) {
            suspiciousUrls.push({
              sourceFile: filePath,
              url: urlInfo.url,
              line: urlInfo.line,
              type: 'SUSPICIOUS_URL',
              severity: 'MEDIUM',
              reason: reason,
              suggestion: 'Consider using environment variables for URLs'
            });
            break;
          }
        }
      }
    }

    return {
      total: suspiciousUrls.length,
      byFile: groupByFile(suspiciousUrls),
      all: suspiciousUrls
    };
  }
}

export default UrlValidator;
