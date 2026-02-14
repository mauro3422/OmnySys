/**
 * @fileoverview Performance Connection Builder
 * 
 * Builds performance impact connections between atoms
 * based on call relationships and performance metrics.
 * 
 * @module performance-impact/reports/connection-builder
 */

import { PropagationCalculator } from '../metrics/propagation-calculator.js';

/**
 * Builds performance impact connections
 * 
 * @class ConnectionBuilder
 */
export class ConnectionBuilder {
  constructor() {
    this.propagationCalculator = new PropagationCalculator();
  }

  /**
   * Builds connections from atoms and their relationships
   * 
   * @param {Array} atoms - All atoms to analyze
   * @returns {Array} Performance impact connections
   */
  build(atoms) {
    const connections = [];
    const impactLevels = this.propagationCalculator.categorizeByImpact(atoms);

    // For each atom, check if it calls slow functions
    for (const atom of atoms) {
      const calls = atom.calls || [];

      for (const call of calls) {
        const connection = this._findImpactConnection(
          atom,
          call,
          impactLevels
        );

        if (connection) {
          connections.push(connection);
        }
      }
    }

    return connections;
  }

  /**
   * Finds impact connection for a specific call
   * @private
   * @param {Object} atom - Source atom
   * @param {string} call - Call being made
   * @param {Object} impactLevels - Categorized impact levels
   * @returns {Object|null} Connection or null if no impact
   */
  _findImpactConnection(atom, call, impactLevels) {
    for (const [level, slowAtoms] of Object.entries(impactLevels)) {
      const target = slowAtoms.find(a =>
        call.includes(a.name) || call.includes(a.id)
      );

      if (target && target.id !== atom.id) {
        const propagatedImpact = this.propagationCalculator.calculate(
          atom.performance,
          target.performance
        );

        return {
          type: 'performance-impact',
          from: target.id,
          to: atom.id,
          impact: {
            sourceLevel: level,
            sourceScore: target.performance.impactScore,
            propagatedScore: propagatedImpact.score,
            severity: propagatedImpact.severity
          },
          reason: this.propagationCalculator.generateReason(target, atom),
          confidence: 0.75,
          warning: propagatedImpact.severity === 'high'
        };
      }
    }

    return null;
  }
}

export default ConnectionBuilder;
