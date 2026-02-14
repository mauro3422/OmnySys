/**
 * @fileoverview Queries Module - Exportaciones de consultas
 * 
 * @module module-system/queries
 */

export { 
  queryImpact,
  calculateImpactRisk,
  summarizeImpact
} from './impact-query.js';

export { 
  queryDataFlow,
  listDataFlows,
  findFlowsByModule,
  findFlowsByFunction
} from './dataflow-query.js';
