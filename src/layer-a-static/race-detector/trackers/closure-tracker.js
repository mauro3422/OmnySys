/**
 * @fileoverview closure-tracker.js
 *
 * Tracks state captured and modified in closures
 *
 * @module race-detector/trackers/closure-tracker
 */

import { BaseTracker } from './base-tracker.js';

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

    // Find variable declarations at function level
    const declarations = this.findVariableDeclarations(code);

    // Find nested functions
    const nestedFuncPattern = /function\s*\w*\s*\([^)]*\)\s*\{/g;
    let match;

    while ((match = nestedFuncPattern.exec(code)) !== null) {
      const startIdx = match.index;
      const endIdx = this.findMatchingBrace(code, startIdx + match[0].length - 1);
      const nestedCode = code.substring(startIdx, endIdx);

      // Check which outer variables are used in nested function
      for (const decl of declarations) {
        // Variable is used but not redeclared in nested scope
        if (nestedCode.includes(decl.name) &&
          !nestedCode.includes(`let ${decl.name}`) &&
          !nestedCode.includes(`const ${decl.name}`) &&
          !nestedCode.includes(`var ${decl.name}`)) {
          vars.push(decl.name);
        }
      }
    }

    return vars;
  }

  /**
   * Find callback captures
   * @private
   */
  findCallbackCaptures(code) {
    const vars = [];

    // Pattern: setTimeout(() => { modify variable }, ...)
    // Pattern: .then(() => { modify variable })
    const callbackPattern = /(?:setTimeout|setInterval|then|catch|finally)\s*\(\s*\(\)\s*=>\s*\{([^}]+)\}/g;
    let match;

    while ((match = callbackPattern.exec(code)) !== null) {
      const callbackBody = match[1];

      // Find variable modifications in callback
      const modificationPattern = /(\w+)\s*(?:\+\+|--|\+\s*=|-\s*=|\*\s*=|\/\s*=)/g;
      let modMatch;

      while ((modMatch = modificationPattern.exec(callbackBody)) !== null) {
        vars.push(modMatch[1]);
      }
    }

    return vars;
  }

  /**
   * Find variable declarations in code
   * @private
   */
  findVariableDeclarations(code) {
    const declarations = [];
    const pattern = /(?:let|const|var)\s+(\w+)/g;
    let match;

    while ((match = pattern.exec(code)) !== null) {
      declarations.push({
        name: match[1],
        position: match.index
      });
    }

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
