/**
 * @fileoverview closure-tracker.js
 *
 * Tracks state captured and modified in closures
 *
 * @module race-detector/trackers/closure-tracker
 */

import { BaseTracker } from './base-tracker.js';

const VARIABLE_DECLARATION_PATTERN = /(?:let|const|var)\s+(\w+)/g;
const IDENTIFIER_PATTERN = /\b[A-Za-z_$][A-Za-z0-9_$]*\b/g;
const NESTED_FUNCTION_PATTERN = /function\s*\w*\s*\([^)]*\)\s*\{/g;
const CALLBACK_PATTERN = /(?:setTimeout|setInterval|then|catch|finally)\s*\(\s*\(\)\s*=>\s*\{([^}]+)\}/g;
const MODIFICATION_PATTERN = /(\w+)\s*(?:\+\+|--|\+\s*=|-\s*=|\*\s*=|\/\s*=)/g;

function collectDeclaredVariableNames(code) {
  const names = new Set();
  let match;

  while ((match = VARIABLE_DECLARATION_PATTERN.exec(code)) !== null) {
    names.add(match[1]);
  }

  VARIABLE_DECLARATION_PATTERN.lastIndex = 0;
  return names;
}

function collectUsedVariableNames(code) {
  const names = new Set();
  let match;

  while ((match = IDENTIFIER_PATTERN.exec(code)) !== null) {
    names.add(match[0]);
  }

  IDENTIFIER_PATTERN.lastIndex = 0;
  return names;
}

function collectModifiedVariableNames(code) {
  const names = [];
  let match;

  while ((match = MODIFICATION_PATTERN.exec(code)) !== null) {
    names.push(match[1]);
  }

  MODIFICATION_PATTERN.lastIndex = 0;
  return names;
}

/**
 * Tracker for closure state
 */
export class ClosureTracker extends BaseTracker {
  /**
   * Track closure state
   * @param {Object} molecule - Molecule with atoms
   * @param {Object} module - Parent module
   */
  trackMolecule(molecule, module) {
    const atoms = molecule.atoms || [];

    for (const atom of atoms) {
      this.trackAtom(atom, molecule, module);
    }
  }

  /**
   * Track closures in a single atom
   * @private
   */
  trackAtom(atom, molecule, module) {
    // PRIORITY 1: Tree-sitter scope detection
    if (atom.sharedStateAccess && atom.sharedStateAccess.length > 0) {
      const capturedAccesses = atom.sharedStateAccess.filter(a => a.scopeType === 'closure');

      for (const access of capturedAccesses) {
        this.registerAccess(
          'closure',
          access.variable,
          atom,
          module,
          {
            type: access.type === 'write' ? 'captured_write' : 'captured_read',
            line: access.line,
            source: 'tree-sitter'
          },
          molecule.filePath
        );
      }

      if (capturedAccesses.length > 0) return; // Confiar en Tree-sitter si encontró algo
    }

    // FALLBACK: Legacy Regex Detection
    if (!atom.code) return;

    const capturedVars = this.findCapturedVariables(atom);

    for (const variable of capturedVars) {
      this.registerAccess(
        'closure',
        variable,
        atom,
        module,
        {
          type: 'captured_write',
          isModification: this.isVariableModified(atom.code, variable)
        },
        molecule.filePath
      );
    }
  }

  /**
   * Find variables captured by closures
   * @private
   */
  findCapturedVariables(atom) {
    const captured = [];
    const code = atom.code || '';

    // Pattern 1: Arrow functions that modify outer variables
    // let count = 0; return () => count++;
    const arrowModifications = this.findArrowFunctionModifications(code);
    captured.push(...arrowModifications);

    // Pattern 2: Nested functions using outer variables
    const nestedUses = this.findNestedFunctionUses(code);
    captured.push(...nestedUses);

    // Pattern 3: Callbacks that capture and modify state
    const callbackCaptures = this.findCallbackCaptures(code);
    captured.push(...callbackCaptures);

    return [...new Set(captured)]; // Remove duplicates
  }

  /**
   * Find arrow function modifications
   * @private
   */
  findArrowFunctionModifications(code) {
    const vars = [];

    // Patterns like: () => count++, () => count += 1
    const patterns = [
      /\(\s*\)\s*=>\s*(\w+)\+\+/g,
      /\(\s*\)\s*=>\s*\+\+(\w+)/g,
      /\(\s*\)\s*=>\s*(\w+)--/g,
      /\(\s*\)\s*=>\s*--(\w+)/g,
      /\(\s*\)\s*=>\s*(\w+)\s*\+\s*=/g,
      /\(\s*\)\s*=>\s*(\w+)\s*-\s*=/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        vars.push(match[1]);
      }
    }

    return vars;
  }

  /**
   * Find variables used in nested functions
   * @private
   */
  findNestedFunctionUses(code) {
    const vars = [];

    const declarationNames = collectDeclaredVariableNames(code);

    let match;

    while ((match = NESTED_FUNCTION_PATTERN.exec(code)) !== null) {
      const startIdx = match.index;
      const endIdx = this.findMatchingBrace(code, startIdx + match[0].length - 1);
      const nestedCode = code.substring(startIdx, endIdx);

      const nestedDeclarations = collectDeclaredVariableNames(nestedCode);
      const usedNames = collectUsedVariableNames(nestedCode);

      for (const name of declarationNames) {
        if (!usedNames.has(name) || nestedDeclarations.has(name)) continue;
        vars.push(name);
      }
    }

    NESTED_FUNCTION_PATTERN.lastIndex = 0;
    return vars;
  }

  /**
   * Find callback captures
   * @private
   */
  findCallbackCaptures(code) {
    const vars = [];
    let match;

    while ((match = CALLBACK_PATTERN.exec(code)) !== null) {
      const callbackBody = match[1];
      vars.push(...collectModifiedVariableNames(callbackBody));
    }

    CALLBACK_PATTERN.lastIndex = 0;
    return vars;
  }

  /**
   * Find variable declarations in code
   * @private
   */
  findVariableDeclarations(code) {
    const declarations = [];
    let match;

    while ((match = VARIABLE_DECLARATION_PATTERN.exec(code)) !== null) {
      declarations.push({
        name: match[1],
        position: match.index
      });
    }

    VARIABLE_DECLARATION_PATTERN.lastIndex = 0;
    return declarations;
  }

  /**
   * Find matching closing brace
   * @private
   */
  findMatchingBrace(code, openBracePos) {
    let depth = 1;
    let pos = openBracePos + 1;

    while (depth > 0 && pos < code.length) {
      if (code[pos] === '{') depth++;
      if (code[pos] === '}') depth--;
      pos++;
    }

    return pos;
  }

  /**
   * Check if a variable is modified in the code
   * @private
   */
  isVariableModified(code, variable) {
    const modificationPatterns = [
      new RegExp(`\\b${variable}\\s*[=+\-*/%]`),
      new RegExp(`\\b${variable}\\+\\+`),
      new RegExp(`\\+\\+\\b${variable}\\b`),
      new RegExp(`\\b${variable}\\--`),
      new RegExp(`--\\b${variable}\\b`)
    ];

    return modificationPatterns.some(p => p.test(code));
  }
}

export default ClosureTracker;
