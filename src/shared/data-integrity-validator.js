/**
 * @fileoverview Data Integrity Validator
 * 
 * Validates consistency and integrity of OmnySys data structures.
 * Ensures SSOT (Single Source of Truth) is maintained.
 * 
 * VALIDATION RULES:
 * 1. Atoms must have required fields (id, name, type, complexity)
 * 2. Molecules must reference valid atoms
 * 3. Cross-references must be consistent (calledBy <-> calls)
 * 4. Derived data must match source data
 * 5. No orphaned references
 * 
 * @module shared/data-integrity-validator
 * @version 1.0.0
 */

import { createLogger } from '#utils/logger.js';
import { safeReadJson } from '#utils/json-safe.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('integrity-validator');

/**
 * Validation result structure
 */
export class ValidationResult {
  constructor() {
    this.valid = true;
    this.errors = [];
    this.warnings = [];
    this.stats = {
      atomsChecked: 0,
      moleculesChecked: 0,
      filesChecked: 0,
      referencesChecked: 0
    };
  }

  addError(message, context = {}) {
    this.valid = false;
    this.errors.push({ message, context, timestamp: new Date().toISOString() });
    logger.error(`Integrity Error: ${message}`, context);
  }

  addWarning(message, context = {}) {
    this.warnings.push({ message, context, timestamp: new Date().toISOString() });
    logger.warn(`Integrity Warning: ${message}`, context);
  }
}

/**
 * Main Data Integrity Validator
 */
export class DataIntegrityValidator {
  constructor(omnysysPath) {
    this.omnysysPath = omnysysPath;
    this.atoms = new Map();
    this.molecules = new Map();
    this.files = new Map();
  }

  /**
   * Run complete validation suite
   * @returns {ValidationResult}
   */
  async validate() {
    logger.info('Starting data integrity validation...');
    const result = new ValidationResult();

    try {
      // Phase 1: Load all data
      await this.loadAllData(result);
      
      // Phase 2: Validate atoms
      this.validateAtoms(result);
      
      // Phase 3: Validate molecules
      this.validateMolecules(result);
      
      // Phase 4: Validate cross-references
      this.validateCrossReferences(result);
      
      // Phase 5: Validate derivations
      this.validateDerivations(result);
      
      // Phase 6: Check for orphans
      this.checkOrphans(result);

    } catch (error) {
      result.addError('Validation failed with exception', { error: error.message });
      logger.error('Validation exception:', error);
    }

    this.logSummary(result);
    return result;
  }

  /**
   * Load all data from .omnysysdata/
   */
  async loadAllData(result) {
    logger.debug('Loading data from .omnysysdata/');

    // Load atoms
    const atomsPath = path.join(this.omnysysPath, 'atoms');
    try {
      const atomDirs = await fs.readdir(atomsPath);
      for (const dir of atomDirs) {
        const atomFiles = await fs.readdir(path.join(atomsPath, dir));
        for (const file of atomFiles) {
          if (file.endsWith('.json')) {
            const atom = await safeReadJson(path.join(atomsPath, dir, file));
            if (atom) {
              this.atoms.set(atom.id || `${dir}::${file.replace('.json', '')}`, atom);
            }
          }
        }
      }
      result.stats.atomsChecked = this.atoms.size;
      logger.info(`Loaded ${this.atoms.size} atoms`);
    } catch (error) {
      result.addError('Failed to load atoms', { error: error.message });
    }

    // Load molecules
    const moleculesPath = path.join(this.omnysysPath, 'molecules');
    try {
      const moleculeFiles = await fs.readdir(moleculesPath);
      for (const file of moleculeFiles) {
        if (file.endsWith('.molecule.json')) {
          const molecule = await safeReadJson(path.join(moleculesPath, file));
          if (molecule) {
            this.molecules.set(molecule.id || file.replace('.molecule.json', ''), molecule);
          }
        }
      }
      result.stats.moleculesChecked = this.molecules.size;
      logger.info(`Loaded ${this.molecules.size} molecules`);
    } catch (error) {
      result.addError('Failed to load molecules', { error: error.message });
    }
  }

  /**
   * Validate atom structure and required fields
   */
  validateAtoms(result) {
    logger.debug('Validating atoms...');

    for (const [atomId, atom] of this.atoms) {
      // Required fields
      if (!atom.id) {
        result.addError('Atom missing id', { atomId });
      }
      if (!atom.name) {
        result.addError('Atom missing name', { atomId });
      }
      if (atom.type !== 'atom') {
        result.addError('Atom has incorrect type', { atomId, type: atom.type });
      }
      if (typeof atom.complexity !== 'number') {
        result.addWarning('Atom missing complexity', { atomId });
      }

      // Validate calls array
      if (atom.calls && !Array.isArray(atom.calls)) {
        result.addError('Atom calls is not an array', { atomId });
      }

      // Validate calledBy array
      if (atom.calledBy && !Array.isArray(atom.calledBy)) {
        result.addError('Atom calledBy is not an array', { atomId });
      }

      // Validate archetype structure
      if (atom.archetype) {
        if (!atom.archetype.type) {
          result.addWarning('Atom archetype missing type', { atomId });
        }
        if (typeof atom.archetype.severity !== 'number') {
          result.addWarning('Atom archetype missing severity', { atomId });
        }
      }

      // Validate parent molecule reference
      if (!atom.parentMolecule) {
        result.addWarning('Atom missing parentMolecule', { atomId });
      } else if (!this.molecules.has(atom.parentMolecule)) {
        result.addError('Atom references non-existent molecule', { 
          atomId, 
          parentMolecule: atom.parentMolecule 
        });
      }
    }
  }

  /**
   * Validate molecule structure and atom references
   */
  validateMolecules(result) {
    logger.debug('Validating molecules...');

    for (const [moleculeId, molecule] of this.molecules) {
      // Required fields
      if (!molecule.id) {
        result.addError('Molecule missing id', { moleculeId });
      }
      if (molecule.type !== 'molecule') {
        result.addError('Molecule has incorrect type', { moleculeId, type: molecule.type });
      }

      // Validate atoms array
      if (!molecule.atoms) {
        result.addWarning('Molecule missing atoms array', { moleculeId });
      } else if (!Array.isArray(molecule.atoms)) {
        result.addError('Molecule atoms is not an array', { moleculeId });
      } else {
        // Check each atom reference
        for (const atomRef of molecule.atoms) {
          const atomId = typeof atomRef === 'string' ? atomRef : atomRef.id;
          if (!this.atoms.has(atomId)) {
            result.addError('Molecule references non-existent atom', { 
              moleculeId, 
              atomId 
            });
          }
        }

        // Verify consistency: molecule should have same atoms as referenced
        const actualAtoms = Array.from(this.atoms.values())
          .filter(a => a.parentMolecule === moleculeId)
          .map(a => a.id);
        
        const referencedAtoms = molecule.atoms.map(ref => 
          typeof ref === 'string' ? ref : ref.id
        );

        const missingInMolecule = actualAtoms.filter(id => !referencedAtoms.includes(id));
        const extraInMolecule = referencedAtoms.filter(id => !actualAtoms.includes(id));

        if (missingInMolecule.length > 0) {
          result.addError('Atoms exist but not referenced in molecule', {
            moleculeId,
            missingAtoms: missingInMolecule
          });
        }

        if (extraInMolecule.length > 0) {
          result.addError('Molecule references non-existent atoms', {
            moleculeId,
            extraAtoms: extraInMolecule
          });
        }
      }
    }
  }

  /**
   * Validate cross-references between atoms (calledBy <-> calls)
   */
  validateCrossReferences(result) {
    logger.debug('Validating cross-references...');

    let refsChecked = 0;

    for (const [atomId, atom] of this.atoms) {
      if (!atom.calls) continue;

      for (const call of atom.calls) {
        refsChecked++;
        const targetName = typeof call === 'string' ? call : call.name;
        
        // Find target atom
        const targetAtom = Array.from(this.atoms.values())
          .find(a => a.name === targetName);

        if (targetAtom) {
          // Verify bidirectional reference
          const hasBackRef = targetAtom.calledBy?.some(ref => {
            const refName = typeof ref === 'string' ? ref : ref.name;
            return refName === atom.name || refName === atom.id;
          });

          if (!hasBackRef) {
            result.addWarning('Missing back-reference (calledBy)', {
              from: atomId,
              to: targetAtom.id,
              call: targetName
            });
          }
        }
      }
    }

    result.stats.referencesChecked = refsChecked;
  }

  /**
   * Validate derived data matches source data
   */
  validateDerivations(result) {
    logger.debug('Validating derivations...');

    for (const [moleculeId, molecule] of this.molecules) {
      if (!molecule.atoms || !Array.isArray(molecule.atoms)) continue;

      // Get actual atoms
      const atomIds = molecule.atoms.map(ref => 
        typeof ref === 'string' ? ref : ref.id
      );
      const atoms = atomIds.map(id => this.atoms.get(id)).filter(Boolean);

      // Validate derived complexity
      const expectedComplexity = atoms.reduce((sum, a) => sum + (a.complexity || 0), 0);
      if (molecule.totalComplexity !== undefined && 
          molecule.totalComplexity !== expectedComplexity) {
        result.addError('Derived complexity mismatch', {
          moleculeId,
          expected: expectedComplexity,
          actual: molecule.totalComplexity
        });
      }

      // Validate derived export count
      const expectedExports = atoms.filter(a => a.isExported).length;
      if (molecule.exportCount !== undefined && 
          molecule.exportCount !== expectedExports) {
        result.addError('Derived export count mismatch', {
          moleculeId,
          expected: expectedExports,
          actual: molecule.exportCount
        });
      }

      // Validate derived hasNetworkCalls
      const expectedNetwork = atoms.some(a => a.hasNetworkCalls);
      if (molecule.hasNetworkCalls !== undefined && 
          molecule.hasNetworkCalls !== expectedNetwork) {
        result.addError('Derived hasNetworkCalls mismatch', {
          moleculeId,
          expected: expectedNetwork,
          actual: molecule.hasNetworkCalls
        });
      }
    }
  }

  /**
   * Check for orphaned data
   */
  checkOrphans(result) {
    logger.debug('Checking for orphans...');

    // Atoms without molecules
    for (const [atomId, atom] of this.atoms) {
      if (!atom.parentMolecule) {
        result.addWarning('Orphaned atom (no parent molecule)', { atomId });
      }
    }

    // Molecules without atoms
    for (const [moleculeId, molecule] of this.molecules) {
      if (!molecule.atoms || molecule.atoms.length === 0) {
        result.addWarning('Empty molecule (no atoms)', { moleculeId });
      }
    }
  }

  /**
   * Log validation summary
   */
  logSummary(result) {
    logger.info('='.repeat(60));
    logger.info('DATA INTEGRITY VALIDATION COMPLETE');
    logger.info('='.repeat(60));
    logger.info(`Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
    logger.info(`Atoms checked: ${result.stats.atomsChecked}`);
    logger.info(`Molecules checked: ${result.stats.moleculesChecked}`);
    logger.info(`References checked: ${result.stats.referencesChecked}`);
    logger.info(`Errors: ${result.errors.length}`);
    logger.info(`Warnings: ${result.warnings.length}`);
    
    if (result.errors.length > 0) {
      logger.info('\n❌ ERRORS:');
      result.errors.forEach((err, i) => {
        logger.info(`  ${i + 1}. ${err.message}`);
      });
    }
    
    if (result.warnings.length > 0) {
      logger.info('\n⚠️  WARNINGS:');
      result.warnings.forEach((warn, i) => {
        logger.info(`  ${i + 1}. ${warn.message}`);
      });
    }
    
    logger.info('='.repeat(60));
  }
}

/**
 * Quick validation function
 * @param {string} omnysysPath - Path to .omnysysdata/
 * @returns {Promise<ValidationResult>}
 */
export async function validateDataIntegrity(omnysysPath) {
  const validator = new DataIntegrityValidator(omnysysPath);
  return validator.validate();
}

/**
 * Benchmark validation performance
 * @param {string} omnysysPath - Path to .omnysysdata/
 * @returns {Promise<Object>}
 */
export async function benchmarkValidation(omnysysPath) {
  const start = Date.now();
  const result = await validateDataIntegrity(omnysysPath);
  const duration = Date.now() - start;

  return {
    duration,
    valid: result.valid,
    stats: result.stats,
    errors: result.errors.length,
    warnings: result.warnings.length,
    performance: {
      atomsPerMs: result.stats.atomsChecked / duration,
      moleculesPerMs: result.stats.moleculesChecked / duration
    }
  };
}

export default DataIntegrityValidator;
