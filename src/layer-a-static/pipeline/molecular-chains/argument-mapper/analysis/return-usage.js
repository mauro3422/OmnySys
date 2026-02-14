/**
 * @fileoverview Return usage tracking
 * @module molecular-chains/argument-mapper/analysis/return-usage
 */

import { findVariableUsages, escapeRegex } from '../utils/code-utils.js';

/**
 * Tracks how the callee return value is used in the caller
 * @param {Object} callerAtom - Caller atom
 * @param {Object} calleeAtom - Callee atom
 * @param {Object} callInfo - Call information
 * @returns {Object} Return usage analysis
 */
export function trackReturnUsage(callerAtom, calleeAtom, callInfo) {
  const calleeReturn = calleeAtom.dataFlow?.outputs?.find(o => 
    o.type === 'return'
  );
  
  if (!calleeReturn) {
    return { isUsed: false, reason: 'no_return' };
  }

  // Search in caller where this call is used
  const callerCode = callerAtom.code || '';
  const callLine = callInfo.line || 0;
  const calleeName = callInfo.callee || calleeAtom.name;
  
  // Check if result is assigned to a variable
  const assignmentPattern = new RegExp(
    `(const|let|var)\\s+(\\w+)\\s*=\\s*${escapeRegex(calleeName)}`,
    'g'
  );
  
  const assignments = [...callerCode.matchAll(assignmentPattern)];
  
  if (assignments.length > 0) {
    const assignedVar = assignments[0][2];
    
    // Search usages of this variable
    const usages = findVariableUsages(assignedVar, callerCode, callLine);
    
    return {
      isUsed: usages.length > 0,
      assignedTo: assignedVar,
      usages: usages,
      line: callLine
    };
  }

  // Check if used directly (without assignment)
  const directUsage = callerCode.includes(calleeName);
  
  return {
    isUsed: directUsage,
    assignedTo: null,
    usages: directUsage ? ['direct_usage'] : [],
    line: callLine
  };
}

export default trackReturnUsage;
