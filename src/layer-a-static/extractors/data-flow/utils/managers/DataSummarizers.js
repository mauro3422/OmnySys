/**
 * @fileoverview DataSummarizers.js
 * 
 * Data summarization utilities.
 * 
 * @module data-flow/utils/managers/DataSummarizers
 */

/**
 * Summarizes tokens
 */
export class TokenSummarizer {
  static summarize(tokens) {
    return {
      functionType: tokens.function,
      paramCount: tokens.inputs.length,
      transformCount: tokens.transforms.length,
      outputCount: tokens.outputs.length,
      domains: tokens.domains,
      flowType: tokens.flowType
    };
  }
}

/**
 * Summarizes graph
 */
export class GraphSummarizer {
  static summarize(graph) {
    return {
      totalNodes: graph.meta?.totalNodes,
      totalEdges: graph.meta?.totalEdges,
      complexity: graph.meta?.complexity,
      hasSideEffects: graph.meta?.hasSideEffects,
      hasAsync: graph.meta?.hasAsync
    };
  }
}

/**
 * Calculates statistics
 */
export class StatisticsCalculator {
  static calculate(existing = {}, newFeatures) {
    const stats = {
      avgTransformCount: 0,
      avgComplexity: 0,
      mostCommonDomain: '',
      sampleCount: (existing?.sampleCount || 0) + 1
    };

    if (existing?.avgTransformCount) {
      stats.avgTransformCount = 
        (existing.avgTransformCount * existing.sampleCount + newFeatures.transformCount) /
        stats.sampleCount;
    } else {
      stats.avgTransformCount = newFeatures.transformCount;
    }

    if (existing?.avgComplexity) {
      stats.avgComplexity = 
        (existing.avgComplexity * existing.sampleCount + newFeatures.transformCount) /
        stats.sampleCount;
    } else {
      stats.avgComplexity = newFeatures.transformCount;
    }

    return stats;
  }
}

