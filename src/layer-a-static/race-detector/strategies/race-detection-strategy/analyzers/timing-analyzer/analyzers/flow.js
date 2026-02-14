/**
 * @fileoverview flow.js
 * 
 * Business flow analysis
 * 
 * @module race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/analyzers/flow
 */

import { haveSameAwaitContext } from './patterns.js';

/**
 * Check if accesses are in same business flow
 * 
 * @param {Object} access1 - First access
 * @param {Object} access2 - Second access
 * @param {Object} project - Project data
 * @param {Object} analyzer - TimingAnalyzer instance
 * @returns {boolean} - True if same flow
 */
export function sameBusinessFlow(access1, access2, project, analyzer) {
  // Strategy 1: Same file, same caller function = same flow
  if (access1.file === access2.file && 
      access1.caller === access2.caller) {
    return true;
  }
  
  // Strategy 2: Check if they share common callers
  const callers1 = analyzer.getAtomCallers(access1.atom, project);
  const callers2 = analyzer.getAtomCallers(access2.atom, project);
  const sharedCallers = callers1.filter(c => callers2.includes(c));
  
  if (sharedCallers.length > 0) {
    for (const callerId of sharedCallers) {
      if (areSequentialInCaller(callerId, access1, access2, project, analyzer)) {
        return true;
      }
    }
  }
  
  // Strategy 3: Check if both are called from same entry point
  const entryPoints1 = analyzer.findEntryPoints(access1.atom, project);
  const entryPoints2 = analyzer.findEntryPoints(access2.atom, project);
  
  if (!entryPoints1.some(ep => entryPoints2.includes(ep))) {
    return false;
  }
  
  // Strategy 4: Analyze async context
  if (access1.isAsync && access2.isAsync) {
    const sameAwaitContext = haveSameAwaitContext(access1, access2, project, analyzer);
    if (!sameAwaitContext) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if accesses share entry point
 * 
 * @param {Object} access1 - First access
 * @param {Object} access2 - Second access
 * @param {Object} project - Project data
 * @param {Object} analyzer - TimingAnalyzer instance
 * @returns {boolean} - True if same entry point
 */
export function sameEntryPoint(access1, access2, project, analyzer) {
  if (access1.module === access2.module && 
      access1.isExported === access2.isExported) {
    return true;
  }
  
  const entryPoints1 = analyzer.findEntryPoints(access1.atom, project);
  const entryPoints2 = analyzer.findEntryPoints(access2.atom, project);
  
  return entryPoints1.some(ep => entryPoints2.includes(ep));
}

/**
 * Check if two accesses are sequential within a caller function
 */
function areSequentialInCaller(callerId, access1, access2, project, analyzer) {
  const caller = analyzer.findAtomById(callerId, project);
  if (!caller?.code) return false;
  
  const atom1Name = access1.atom.split('::')[1];
  const atom2Name = access2.atom.split('::')[1];
  
  const lines = caller.code.split('\n');
  let line1 = -1, line2 = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(atom1Name) && lines[i].includes('await')) {
      line1 = i;
    }
    if (lines[i].includes(atom2Name) && lines[i].includes('await')) {
      line2 = i;
    }
  }
  
  if (line1 === -1 || line2 === -1) return false;
  
  const hasDependency = checkDependencyChain(caller, access1, access2);
  return hasDependency || Math.abs(line1 - line2) <= 3;
}

function checkDependencyChain(caller, access1, access2) {
  const code = caller.code;
  const atom1Name = access1.atom.split('::')[1];
  const atom2Name = access2.atom.split('::')[1];
  
  const regex = new RegExp(
    `(const|let|var)\\s+(\\w+)\\s*=\\s*await\\s+${atom1Name}.*?` +
    `${atom2Name}\\s*\\(\\s*\\2`,
    's'
  );
  
  return regex.test(code);
}
