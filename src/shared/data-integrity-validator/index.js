/**
 * @fileoverview Data Integrity Validator - Modular Architecture
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
 * @module data-integrity-validator
 * @version 2.0.0
 */

import { createLogger } from '#utils/logger.js';
import { ValidationResult } from './reports/validation-result.js';
import { SummaryReporter } from './reports/summary-reporter.js';
import { DataLoader } from './checks/data-loader.js';
import { OrphanChecker } from './checks/orphan-checker.js';
import { AtomValidator } from './validators/atom-validator.js';
import { MoleculeValidator } from './validators/molecule-validator.js';
import { CrossReferenceValidator } from './validators/cross-reference-validator.js';
import { DerivationValidator } from './validators/derivation-validator.js';

const logger = createLogger('integrity-validator');

/**
 * Main Data Integrity Validator
 * 
 * @class DataIntegrityValidator
 */
export class DataIntegrityValidator {
  /**
   * Creates a validator
   * @param {string} omnysysPath - Path to .omnysysdata/
   */
  constructor(omnysysPath) {
    this.omnysysPath = omnysysPath;
    this.dataLoader = new DataLoader(omnysysPath);
    this.summaryReporter = new SummaryReporter();
    
    // Initialize validators
    this.validators = {
      atom: new AtomValidator(),
      molecule: new MoleculeValidator(),
      crossReference: new CrossReferenceValidator(),
      derivation: new DerivationValidator()
    };

    this.checks = {
      orphan: new OrphanChecker()
    };
  }

  /**
   * Runs complete validation suite
   * 
   * @returns {Promise<ValidationResult>}
   */
  async validate() {
    logger.info('Starting data integrity validation...');
    const result = new ValidationResult();

    try {
      // Phase 1: Load all data
      const { atoms, molecules } = await this.dataLoader.loadAll(result);

      // Phase 2: Validate atoms
      this._validateAtoms(atoms, molecules, result);

      // Phase 3: Validate molecules
      this._validateMolecules(molecules, atoms, result);

      // Phase 4: Validate cross-references
      this.validators.crossReference.validate(atoms, result);

      // Phase 5: Validate derivations
      this.validators.derivation.validate(molecules, atoms, result);

      // Phase 6: Check for orphans
      this.checks.orphan.check(atoms, molecules, result);

    } catch (error) {
      result.addError('Validation failed with exception', { error: error.message });
      logger.error('Validation exception:', error);
    }

    this.summaryReporter.logSummary(result);
    return result;
  }

  /**
   * Validates all atoms
   * @private
   */
  _validateAtoms(atoms, molecules, result) {
    for (const [atomId, atom] of atoms) {
      this.validators.atom.validate(atomId, atom, result, molecules);
    }
  }

  /**
   * Validates all molecules
   * @private
   */
  _validateMolecules(molecules, atoms, result) {
    for (const [moleculeId, molecule] of molecules) {
      this.validators.molecule.validate(moleculeId, molecule, result, atoms);
    }
  }
}

/**
 * Quick validation function
 * 
 * @param {string} omnysysPath - Path to .omnysysdata/
 * @returns {Promise<ValidationResult>}
 */
export async function validateDataIntegrity(omnysysPath) {
  const validator = new DataIntegrityValidator(omnysysPath);
  return validator.validate();
}

/**
 * Benchmarks validation performance
 * 
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

// Export all components for advanced usage
export {
  ValidationResult,
  SummaryReporter,
  DataLoader,
  OrphanChecker,
  AtomValidator,
  MoleculeValidator,
  CrossReferenceValidator,
  DerivationValidator
};

export default DataIntegrityValidator;
