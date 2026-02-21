/**
 * @fileoverview Main Branch Extractor
 * Extracts all branches from a function
 * 
 * @module mcp/tools/generate-tests/branch-extractor/main-extractor
 */

import { extractReturnExpr, extractCaseReturn } from './return-extractor.js';
import { findGuardCondition } from './guard-finder.js';
import { parseConditionToInputHints } from './hints-parser.js';
import { resolveNeededImports } from './import-resolver.js';
import { buildAssertionFromExpr } from './assertion-builder.js';
import { buildTestName } from './test-name-builder.js';

/**
 * Extracts all branches from a function with their condition and return
 * 
 * @param {string[]} sourceLines - Function source code lines
 * @param {Object} atom - Atom metadata (dataFlow, imports, inputs)
 * @returns {Array} Branches with metadata
 */
export function extractBranches(sourceLines, atom) {
  if (!sourceLines || sourceLines.length === 0) return [];
  
  const outputs = atom?.dataFlow?.outputs || [];
  const atomInputs = atom?.dataFlow?.inputs || [];
  const atomImports = atom?.imports || [];
  
  const branches = [];
  const seen = new Set();
  
  for (const output of outputs) {
    if (output.type !== 'return') continue;
    
    // line is 1-indexed absolute; atom.line is also 1-indexed
    const relIdx = (output.line || 0) - (atom?.line || 1);
    if (relIdx < 0 || relIdx >= sourceLines.length) continue;
    
    const returnLine = sourceLines[relIdx];
    const returnExpr = extractReturnExpr(returnLine);
    if (!returnExpr || seen.has(returnExpr)) continue;
    seen.add(returnExpr);
    
    // Find if/else condition that guards this return
    const condition = findGuardCondition(sourceLines, relIdx);
    
    // Derive input hints from condition
    const inputHints = parseConditionToInputHints(condition, atomInputs);
    
    // Resolve which constants/modules the test needs
    const neededImports = resolveNeededImports(returnExpr, condition, atomImports, atom?.filePath);
    
    // Build assertion from return expression
    const assertion = buildAssertionFromExpr(returnExpr, neededImports);
    
    // Build descriptive test name
    const testName = buildTestName(condition, returnExpr, atom?.name);
    
    branches.push({
      condition,
      returnExpr,
      inputHints,
      neededImports,
      assertion,
      testName,
      line: output.line
    });
  }
  
  return branches;
}

export default { extractBranches };
