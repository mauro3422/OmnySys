/**
 * @fileoverview Query Test Factory - Validators
 */

export class QueryValidators {
  static isValidProjectMetadata(metadata) {
    return metadata && 
           typeof metadata === 'object' &&
           'version' in metadata &&
           'analyzedAt' in metadata &&
           'projectRoot' in metadata;
  }

  static isValidFileAnalysis(analysis) {
    return analysis && 
           typeof analysis === 'object' &&
           'path' in analysis;
  }

  static isValidConnection(connection) {
    return connection &&
           typeof connection === 'object' &&
           'source' in connection &&
           'target' in connection &&
           typeof connection.source === 'string' &&
           typeof connection.target === 'string';
  }

  static isValidConnectionsResult(result) {
    return result &&
           typeof result === 'object' &&
           Array.isArray(result.sharedState) &&
           Array.isArray(result.eventListeners) &&
           typeof result.total === 'number';
  }

  static isValidRiskAssessment(assessment) {
    return assessment &&
           typeof assessment === 'object' &&
           'report' in assessment &&
           'scores' in assessment;
  }

  static isValidDependencyGraph(graph) {
    return graph &&
           typeof graph === 'object' &&
           Array.isArray(graph.nodes) &&
           Array.isArray(graph.edges);
  }

  static hasRequiredFields(obj, fields) {
    if (!obj || typeof obj !== 'object') return false;
    return fields.every(field => field in obj);
  }
}

