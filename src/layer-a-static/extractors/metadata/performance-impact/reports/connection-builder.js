/**
 * @fileoverview Performance Connection Builder
 * 
 * Builds performance impact connections between atoms
 * based on call relationships and performance metrics.
 * 
 * @module performance-impact/reports/connection-builder
 */

import { PropagationCalculator } from '../metrics/propagation-calculator.js';

function buildImpactIndex(impactLevels) {
  const impactIndex = new Map();

  for (const [level, slowAtoms] of Object.entries(impactLevels || {})) {
    for (const target of slowAtoms || []) {
      if (!target) continue;

      const keys = [target.name, target.id];
      for (const key of keys) {
        if (key === null || key === undefined || key === '') continue;
        const normalizedKey = String(key);
        if (!impactIndex.has(normalizedKey)) {
          impactIndex.set(normalizedKey, { level, target });
        }
      }
    }
  }

  return impactIndex;
}

function extractCallTokens(call) {
  const normalizedCall = String(call || '');
  const tokens = normalizedCall.match(/[A-Za-z0-9_]+/g) || [];
  return new Set([normalizedCall, ...tokens]);
}

function findImpactConnectionForCall(atom, call, impactIndex, propagationCalculator) {
  const callTokens = extractCallTokens(call);

  for (const token of callTokens) {
    const match = impactIndex.get(token);
    if (!match || match.target.id === atom.id) continue;

    const propagatedImpact = propagationCalculator.calculate(
      atom.performance,
      match.target.performance
    );

    return {
      type: 'performance-impact',
      from: match.target.id,
      to: atom.id,
      impact: {
        sourceLevel: match.level,
        sourceScore: match.target.performance.impactScore,
        propagatedScore: propagatedImpact.score,
        severity: propagatedImpact.severity
      },
      reason: propagationCalculator.generateReason(match.target, atom),
      confidence: 0.75,
      warning: propagatedImpact.severity === 'high'
    };
  }

  return null;
}

function buildImpactConnections(atoms, impactIndex, propagationCalculator) {
  const connections = [];

  for (const atom of atoms) {
    const calls = atom.calls || [];

    for (const call of calls) {
      const connection = findImpactConnectionForCall(atom, call, impactIndex, propagationCalculator);
      if (connection) {
        connections.push(connection);
      }
    }
  }

  return connections;
}

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
    if (!Array.isArray(atoms) || atoms.length === 0) {
      return [];
    }

    const impactLevels = this.propagationCalculator.categorizeByImpact(atoms);
    const impactIndex = buildImpactIndex(impactLevels);

    return buildImpactConnections(atoms, impactIndex, this.propagationCalculator);
  }
}

export default ConnectionBuilder;
