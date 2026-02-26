/**
 * @fileoverview Race Detector Integration
 * 
 * Integra el detector de race conditions con el sistema molecular
 * 
 * @module race-detector/integration
 */

import { analyzeProjectRaces, enrichProjectWithRaces } from './integration/analyzer.js';
import { getRacesByModule, getRacesByFile, getRacesByFunction } from './integration/queries.js';
import { generateStateReport } from './integration/reports.js';
import { exportRaceResults } from './integration/exporters.js';

export {
  analyzeProjectRaces,
  enrichProjectWithRaces,
  getRacesByModule,
  getRacesByFile,
  getRacesByFunction,
  generateStateReport,
  exportRaceResults
};

export default {
  analyzeProjectRaces,
  enrichProjectWithRaces,
  getRacesByModule,
  getRacesByFile,
  getRacesByFunction,
  generateStateReport,
  exportRaceResults
};
