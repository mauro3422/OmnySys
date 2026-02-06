/**
 * @fileoverview index.js
 * 
 * Re-export de reportes
 * 
 * @module project-analyzer/reports
 */

export { generateStructureReport } from './structure-report.js';

export {
  calculateStructureStats,
  calculateSubsystemDistribution,
  findMostCohesiveSubsystem,
  calculateOrphanStats
} from './stats-calculator.js';
