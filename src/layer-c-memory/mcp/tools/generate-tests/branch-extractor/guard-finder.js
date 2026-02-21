/**
 * @fileoverview Guard Condition Finder
 * Finds guard conditions (if/else/switch) for returns
 * 
 * @module mcp/tools/generate-tests/branch-extractor/guard-finder
 */

/**
 * Finds the if/else condition that guards a return by tracking backwards.
 * Tracks brace depth to skip already closed sibling blocks.
 * Returns null if return has no guard (default fallback).
 * 
 * Algorithm (upward traversal):
 *   depth=0 → same level as return (can find its guard)
 *   depth>0 → inside a sibling block that already closed (skip it)
 *   On '}': depth++ (start skipping a closed block)
 *   On '{': depth-- (finish skipping that block)
 *     If depth becomes 0, the line with '{' opens a SIBLING block → not our guard,
 *     keep searching.
 * 
 * @param {string[]} sourceLines - Source code lines
 * @param {number} returnRelIdx - Relative index of return line
 * @returns {string|null} Guard condition or null
 */
export function findGuardCondition(sourceLines, returnRelIdx) {
  // Special case: case X: return Y on same line
  const caseResult = checkSameLineCase(sourceLines[returnRelIdx]);
  if (caseResult) return caseResult;
  
  let depth = 0;
  
  for (let i = returnRelIdx - 1; i >= 0; i--) {
    const line = sourceLines[i].trim();
    
    const closes = (line.match(/\}/g) || []).length;
    const opens  = (line.match(/\{/g)  || []).length;
    
    // Before processing guards, update depth according to closing braces (})
    depth += closes;
    
    if (depth > 0) {
      // Inside a sibling block; consume the opening ({) to skip
      depth -= opens;
      // If depth reached 0, we just skipped a complete sibling block — continue
      continue;
    }
    
    // depth === 0: we're at the same level; now subtract opens
    depth -= opens;
    
    // if (condition) { — ONLY if opens=1 (opens a new block at THIS level)
    const ifMatch = line.match(/^(?:} else )?if\s*\((.+)\)\s*\{?\s*$/);
    if (ifMatch) return ifMatch[1].trim();
    
    // else { → return belongs to else (no condition)
    if (/^(?:}\s*)?else\s*\{?\s*$/.test(line)) return null;
    
    // case X:
    const caseMatch = line.match(/^case\s+(.+?)\s*:/);
    if (caseMatch) return `=== ${caseMatch[1].trim()}`;
    
    // default:
    if (/^default\s*:/.test(line)) return null;
    
    // Opening brace of function → we've gone up to the function, exit
    if (/^\{$/.test(line)) break;
  }
  
  return null; // return without guard = default fallback
}

/**
 * Checks if line is a case statement with return
 * @param {string} line - Code line
 * @returns {string|null}
 */
function checkSameLineCase(line) {
  const trimmed = (line || '').trim();
  const sameCaseMatch = trimmed.match(/^case\s+(.+?)\s*:/);
  if (sameCaseMatch) return `=== ${sameCaseMatch[1].trim()}`;
  if (/^default\s*:/.test(trimmed)) return null;
  return null;
}
