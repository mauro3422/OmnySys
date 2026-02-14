/**
 * @fileoverview BrokenConnectionsDetector.js
 * 
 * Detects broken connections pointing to non-existent files/URLs.
 * 
 * @module analyses/tier3/detectors/BrokenConnectionsDetector
 */

import { WorkerDetector } from './WorkerDetector.js';
import { ImportDetector } from './ImportDetector.js';
import { DuplicateDetector } from './DuplicateDetector.js';
import { DeadCodeDetector } from './DeadCodeDetector.js';
import { UrlValidator } from '../validators/UrlValidator.js';

/**
 * Detects broken connections in the codebase
 */
export class BrokenConnectionsDetector {
  constructor() {
    this.workerDetector = new WorkerDetector();
    this.importDetector = new ImportDetector();
    this.duplicateDetector = new DuplicateDetector();
    this.deadCodeDetector = new DeadCodeDetector();
    this.urlValidator = new UrlValidator();
  }

  detectBrokenWorkers(systemMap, advancedAnalysis) {
    return this.workerDetector.detect(systemMap, advancedAnalysis);
  }

  detectBrokenDynamicImports(systemMap) {
    return this.importDetector.detect(systemMap);
  }

  detectDuplicateFunctions(systemMap) {
    return this.duplicateDetector.detect(systemMap);
  }

  detectDeadFunctions(systemMap) {
    return this.deadCodeDetector.detect(systemMap);
  }

  detectSuspiciousUrls(advancedAnalysis) {
    return this.urlValidator.validate(advancedAnalysis);
  }

  analyze(systemMap, advancedAnalysis) {
    const safeSystemMap = systemMap || {};
    const safeAdvancedAnalysis = advancedAnalysis || {};
    
    const brokenWorkers = this.detectBrokenWorkers(safeSystemMap, safeAdvancedAnalysis);
    const brokenDynamics = this.detectBrokenDynamicImports(safeSystemMap);
    const duplicates = this.detectDuplicateFunctions(safeSystemMap);
    const deadFunctions = this.detectDeadFunctions(safeSystemMap);
    const suspiciousUrls = this.detectSuspiciousUrls(safeAdvancedAnalysis);

    const allIssues = [
      ...brokenWorkers.all,
      ...brokenDynamics.all,
      ...duplicates.all,
      ...deadFunctions.all,
      ...suspiciousUrls.all
    ];

    return {
      summary: {
        total: allIssues.length,
        critical: allIssues.filter(i => i.severity === 'HIGH').length,
        warning: allIssues.filter(i => i.severity === 'MEDIUM').length,
        info: allIssues.filter(i => i.severity === 'LOW').length
      },
      brokenWorkers,
      brokenDynamicImports: brokenDynamics,
      duplicateFunctions: duplicates,
      deadFunctions,
      suspiciousUrls,
      all: allIssues
    };
  }
}

export default BrokenConnectionsDetector;
