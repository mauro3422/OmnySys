/**
 * @fileoverview Relationship Analyzer
 *
 * Analyzes file-to-file relationships inside the semantic inference engine.
 *
 * @module inference-engine/relationship-analyzer
 */

import { analyzeNeighborhood } from './detectors/neighborhood.js';
import {
  analyzeRelationshipBarriers,
  buildRelationshipHierarchy
} from './relationship-analyzer/helpers.js';

export class RelationshipAnalyzer {
  constructor() {
    this._cache = new Map();
  }

  analyze(fileAnalysis, allFiles = new Map()) {
    const filePath = fileAnalysis.filePath || '';
    const cached = this._cache.get(filePath);

    if (cached) {
      return cached;
    }

    const relationships = {
      neighbors: analyzeNeighborhood(fileAnalysis, allFiles).neighbors,
      hierarchy: buildRelationshipHierarchy(fileAnalysis),
      barriers: analyzeRelationshipBarriers(fileAnalysis),
      coupling: this._calculateCoupling(fileAnalysis)
    };

    this._cache.set(filePath, relationships);

    return relationships;
  }

  _calculateCoupling(fileAnalysis) {
    const incoming = fileAnalysis.usedBy?.length || 0;
    const outgoing = fileAnalysis.imports?.length || 0;
    const totalConnections = incoming + outgoing;
    const score = Math.min(1, Math.log10(totalConnections + 1) / 2);

    return { incoming, outgoing, score };
  }

  clearCache() {
    this._cache.clear();
  }
}

export default RelationshipAnalyzer;
