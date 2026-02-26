/**
 * @fileoverview singleton-tracker.js
 *
 * Tracks singleton patterns and lazy initialization
 *
 * @module race-detector/trackers/singleton-tracker
 */

import { BaseTracker } from './base-tracker.js';

/**
 * Tracker for singleton patterns
 */
export class SingletonTracker extends BaseTracker {
  /**
   * Track singleton patterns
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
   * Track singleton patterns in a single atom
   * @private
   */
  trackAtom(atom, molecule, module) {
    // PRIORITY 1: Use Tree-sitter sharedStateAccess
    if (atom.sharedStateAccess && atom.sharedStateAccess.length > 0) {
      for (const access of atom.sharedStateAccess) {
        // Un singleton suele ser un acceso a nivel de módulo o global que se inicializa condicionalmente
        // Aunque Tree-sitter no detecta "singleton" per se, si vemos una escritura en un scope
        // que no es local, es un candidato a estado compartido (y potencialmente singleton)

        if (access.type === 'write' && (access.scopeType === 'module' || access.scopeType === 'global')) {
          // Si el código contiene un patrón de inicialización para esta variable específica
          const varName = access.variable;
          const initializationPattern = new RegExp(`if\\s*\\(\\s*!${varName}|${varName}\\s*===\\s*null|${varName}\\s*\\?\\?\\?=`);

          if (initializationPattern.test(atom.code || '')) {
            this.registerAccess(
              'singleton',
              varName,
              atom,
              module,
              {
                type: 'initialization',
                isAsync: atom.isAsync,
                pattern: 'conditional_initialization',
                source: 'tree-sitter'
              },
              molecule.filePath
            );
          }
        } else if (access.type === 'read' && (access.scopeType === 'module' || access.scopeType === 'global')) {
          // Registro de acceso (uso) del singleton
          this.registerAccess(
            'singleton',
            access.variable,
            atom,
            module,
            {
              type: 'access',
              line: access.line,
              source: 'tree-sitter'
            },
            molecule.filePath
          );
        }
      }
      return; // Si tenemos datos de Tree-sitter, confiar en ellos
    }

    // FALLBACK: Legacy Regex Detection
    if (!atom.code) return;

    // Detect singleton initialization patterns
    if (this.isSingletonPattern(atom)) {
      const singletonVar = this.extractSingletonVariable(atom);
      if (singletonVar) {
        this.registerAccess(
          'singleton',
          singletonVar,
          atom,
          module,
          {
            type: 'initialization',
            isAsync: atom.isAsync,
            pattern: this.detectPatternType(atom.code)
          },
          molecule.filePath
        );
      }
    }

    // Track singleton usage (accessing already initialized singleton)
    const singletonAccesses = this.findSingletonAccesses(atom);
    for (const access of singletonAccesses) {
      this.registerAccess(
        'singleton',
        access.variable,
        atom,
        module,
        {
          type: 'access',
          line: access.line
        },
        molecule.filePath
      );
    }
  }

  /**
   * Check if atom contains singleton pattern
   * @private
   */
  isSingletonPattern(atom) {
    const code = atom.code;
    if (!code) return false;

    const patterns = [
      // if (!variable) { variable = ... }
      /if\s*\(\s*!\w+\s*\)\s*\{[^}]*=\s*(await\s+)?[^}]+\}/,
      // if (variable === null) { ... }
      /if\s*\(\s*\w+\s*===?\s*null\s*\)\s*\{/,
      // if (typeof variable === 'undefined') { ... }
      /if\s*\(\s*typeof\s+\w+\s*===?\s*['"]undefined['"]\s*\)\s*\{/,
      // variable ??= value (nullish coalescing assignment)
      /\w+\s*\?\?\?=\s*/,
      // variable ||= value (logical OR assignment)
      /\w+\s*\|\|=\s*/
    ];

    return patterns.some(p => p.test(code));
  }

  /**
   * Extract the singleton variable name
   * @private
   */
  extractSingletonVariable(atom) {
    const code = atom.code;
    if (!code) return null;

    // Try to extract from if (!variable) pattern
    const nullCheckMatch = code.match(/if\s*\(\s*!(\w+)\s*\)/);
    if (nullCheckMatch) return nullCheckMatch[1];

    // Try to extract from if (variable === null) pattern
    const equalityMatch = code.match(/if\s*\(\s*(\w+)\s*===?\s*null\s*\)/);
    if (equalityMatch) return equalityMatch[1];

    // Try to extract from typeof check
    const typeofMatch = code.match(/if\s*\(\s*typeof\s+(\w+)\s*===?\s*['"]undefined['"]\s*\)/);
    if (typeofMatch) return typeofMatch[1];

    // Try to extract from nullish coalescing
    const coalescingMatch = code.match(/(\w+)\s*\?\?\?=/);
    if (coalescingMatch) return coalescingMatch[1];

    return null;
  }

  /**
   * Detect the specific pattern type
   * @private
   */
  detectPatternType(code) {
    if (/if\s*\(\s*!\w+\s*\)/.test(code)) return 'null_check';
    if (/\?\?\?=/.test(code)) return 'nullish_coalescing';
    if (/\|\|=/.test(code)) return 'logical_or';
    if (/typeof.*undefined/.test(code)) return 'typeof_check';
    return 'unknown';
  }

  /**
   * Find accesses to singleton variables
   * @private
   */
  findSingletonAccesses(atom) {
    const accesses = [];
    const code = atom.code;
    if (!code) return accesses;

    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Pattern: return variable; (after initialization check)
      const returnMatch = line.match(/return\s+(\w+);?\s*$/);
      if (returnMatch && !line.includes('if')) {
        accesses.push({ variable: returnMatch[1], line: i + 1 });
      }
    }

    return accesses;
  }
}

export default SingletonTracker;
