/**
 * @fileoverview Alert Builder
 * 
 * Builds tunnel vision alert objects with proper formatting
 * and recommendations.
 * 
 * @module tunnel-vision-detector/reports/alert-builder
 */

import { SeverityAnalyzer } from '../analyzers/severity-analyzer.js';

/**
 * Builds tunnel vision alerts
 * 
 * @class AlertBuilder
 */
export class AlertBuilder {
  constructor() {
    this.severityAnalyzer = new SeverityAnalyzer();
  }

  /**
   * Builds atomic alert
   * 
   * @param {Object} data - Alert data
   * @returns {Object} Formatted alert
   */
  buildAtomicAlert(data) {
    const { modifiedAtom, filePath, functionName, atom, unmodifiedCallers, totalCallers } = data;

    const severity = this.severityAnalyzer.calculate(atom, unmodifiedCallers.length);

    return {
      type: 'TUNNEL_VISION_ATOMIC',
      version: '3.0',
      severity,
      modifiedAtom,
      filePath,
      functionName,
      atom: this._formatAtomInfo(atom),
      callers: {
        total: totalCallers,
        unmodified: unmodifiedCallers.length,
        list: unmodifiedCallers.slice(0, 10)
      },
      recommendations: this._generateAtomicRecommendations(severity, atom, unmodifiedCallers),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Builds aggregated file alert
   * 
   * @param {Object} data - Alert data
   * @returns {Object} Formatted alert
   */
  buildFileAlert(data) {
    const { filePath, atomsModified, totalAtomsModified, unmodifiedCallers, details } = data;

    const maxSeverity = this.severityAnalyzer.getMostSevere(
      details.map(d => d.severity)
    );

    return {
      type: 'TUNNEL_VISION_FILE',
      version: '3.0',
      severity: maxSeverity,
      filePath,
      atomsModified: {
        count: totalAtomsModified,
        list: atomsModified
      },
      callers: {
        totalAffected: unmodifiedCallers.length,
        list: unmodifiedCallers.slice(0, 15)
      },
      details,
      recommendations: this._generateFileRecommendations(maxSeverity, totalAtomsModified, unmodifiedCallers.length),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Formats atom info for alert
   * @private
   */
  _formatAtomInfo(atom) {
    return {
      name: atom.name,
      complexity: atom.complexity,
      archetype: atom.archetype,
      isExported: atom.isExported,
      isAsync: atom.isAsync,
      hasSideEffects: atom.hasSideEffects
    };
  }

  /**
   * Generates recommendations for atomic alert
   * @private
   */
  _generateAtomicRecommendations(severity, atom, unmodifiedCallers) {
    const recommendations = [];

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      recommendations.push(`The function '${atom.name}' has ${unmodifiedCallers.length} unmodified callers`);

      if (atom.archetype?.type === 'hot-path') {
        recommendations.push('This is a hot-path function - changes affect many places');
      }
      if (atom.archetype?.type === 'god-function') {
        recommendations.push('Complex function - consider splitting it before modifying');
      }

      recommendations.push('Run tests on affected files before committing');
    } else {
      recommendations.push(`Verify if the ${unmodifiedCallers.length} callers need updates`);
    }

    if (atom.hasSideEffects) {
      recommendations.push('This function has side effects - review side effects');
    }

    if (!atom.hasErrorHandling && atom.hasNetworkCalls) {
      recommendations.push('Function with network calls - ensure error handling');
    }

    return recommendations;
  }

  /**
   * Generates recommendations for file alert
   * @private
   */
  _generateFileRecommendations(severity, atomsModified, totalCallers) {
    const recommendations = [];

    recommendations.push(`${atomsModified} exported functions modified in this file`);
    recommendations.push(`${totalCallers} caller functions potentially affected`);

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      recommendations.push('HIGH RISK - Consider smaller, gradual changes');
      recommendations.push('Run full test suite before committing');
    }

    recommendations.push('Use "getFunctionDetails" to see impact of each modified function');

    return recommendations;
  }
}

export default AlertBuilder;
