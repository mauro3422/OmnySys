/**
 * @fileoverview Issue Manager
 * 
 * Gestiona la creación, almacenamiento y consulta de issues de consistencia.
 * Centraliza la lógica de creación de issues para mantener consistencia.
 * 
 * @module consistency/issue-manager
 * @version 1.0.0
 */

import { Severity, IssueCategory, DataSystem } from '../../../../types/index.js';
import { addIssue, clear as clearStore } from './storage/issue-store.js';
import { 
  addNonExistentFileIssue,
  addFunctionNotFoundIssue,
  addExportMismatchIssue,
  addMissingAtomsIssue,
  addConnectionNonExistentFileIssue
} from './managers/issue-creator.js';
import { 
  getIssuesBySeverity,
  getIssuesByCategory,
  hasCriticalIssues
} from './managers/issue-filters.js';
import { countBySeverity, countBySystem } from './utils/counters.js';
import { calculateStats, generateSummary } from './utils/stats.js';

/**
 * Issue Manager - Gestiona issues de consistencia
 */
export class IssueManager {
  constructor() {
    this.issues = [];
    this.issueCounter = 0;
  }
  
  addIssue(params) {
    const issue = addIssue(this.issues, this.issueCounter, params);
    this.issueCounter++;
    return issue;
  }
  
  addNonExistentFileIssue(atomId, filePath, isHistorical = false) {
    return addNonExistentFileIssue(this.addIssue.bind(this), atomId, filePath, isHistorical);
  }
  
  addFunctionNotFoundIssue(atomId, functionName, availableDefinitions) {
    return addFunctionNotFoundIssue(this.addIssue.bind(this), atomId, functionName, availableDefinitions);
  }
  
  addExportMismatchIssue(atomId, atomExportStatus, fileExportStatus) {
    return addExportMismatchIssue(this.addIssue.bind(this), atomId, atomExportStatus, fileExportStatus);
  }
  
  addMissingAtomsIssue(filePath, functionCount, classification) {
    return addMissingAtomsIssue(this.addIssue.bind(this), filePath, functionCount, classification);
  }
  
  addConnectionNonExistentFileIssue(connId, filePath, type, isHistorical = false) {
    return addConnectionNonExistentFileIssue(this.addIssue.bind(this), connId, filePath, type, isHistorical);
  }
  
  getIssues() {
    return [...this.issues];
  }
  
  getIssuesBySeverity(severity) {
    return getIssuesBySeverity(this.issues, severity);
  }
  
  getIssuesByCategory(category) {
    return getIssuesByCategory(this.issues, category);
  }
  
  countBySeverity() {
    return countBySeverity(this.issues);
  }
  
  countBySystem() {
    return countBySystem(this.issues);
  }
  
  clear() {
    const cleared = clearStore();
    this.issues = cleared.issues;
    this.issueCounter = cleared.counter;
  }
  
  hasCriticalIssues() {
    return hasCriticalIssues(this.issues, Severity);
  }
  
  calculateStats() {
    return calculateStats(this.issues);
  }
  
  generateSummary(cache) {
    return generateSummary(this.issues, cache);
  }
}

export { Severity, IssueCategory, DataSystem };
export default IssueManager;
