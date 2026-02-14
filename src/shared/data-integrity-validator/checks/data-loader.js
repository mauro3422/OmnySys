/**
 * @fileoverview Data Loader
 * 
 * Loads data from .omnysysdata/ directory.
 * Handles atoms and molecules JSON files.
 * 
 * @module data-integrity-validator/checks/data-loader
 */

import { safeReadJson } from '#utils/json-safe.js';
import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('integrity-validator:loader');

/**
 * Loads data from .omnysysdata/
 * 
 * @class DataLoader
 */
export class DataLoader {
  /**
   * Creates a data loader
   * @param {string} omnysysPath - Path to .omnysysdata/
   */
  constructor(omnysysPath) {
    this.omnysysPath = omnysysPath;
  }

  /**
   * Loads all data (atoms and molecules)
   * 
   * @param {Object} result - Validation result to update
   * @returns {Promise<{atoms: Map, molecules: Map}>}
   */
  async loadAll(result) {
    logger.debug('Loading data from .omnysysdata/');

    const [atoms, molecules] = await Promise.all([
      this._loadAtoms(result),
      this._loadMolecules(result)
    ]);

    return { atoms, molecules };
  }

  /**
   * Loads atoms from atoms/ directory
   * @private
   */
  async _loadAtoms(result) {
    const atoms = new Map();
    const atomsPath = path.join(this.omnysysPath, 'atoms');

    try {
      const atomDirs = await fs.readdir(atomsPath);

      for (const dir of atomDirs) {
        const atomFiles = await fs.readdir(path.join(atomsPath, dir));

        for (const file of atomFiles) {
          if (file.endsWith('.json')) {
            const atom = await safeReadJson(path.join(atomsPath, dir, file));
            if (atom) {
              const id = atom.id || `${dir}::${file.replace('.json', '')}`;
              atoms.set(id, atom);
            }
          }
        }
      }

      result.stats.atomsChecked = atoms.size;
      logger.info(`Loaded ${atoms.size} atoms`);
    } catch (error) {
      result.addError('Failed to load atoms', { error: error.message });
    }

    return atoms;
  }

  /**
   * Loads molecules from molecules/ directory
   * @private
   */
  async _loadMolecules(result) {
    const molecules = new Map();
    const moleculesPath = path.join(this.omnysysPath, 'molecules');

    try {
      const moleculeFiles = await fs.readdir(moleculesPath);

      for (const file of moleculeFiles) {
        if (file.endsWith('.molecule.json')) {
          const molecule = await safeReadJson(path.join(moleculesPath, file));
          if (molecule) {
            const id = molecule.id || file.replace('.molecule.json', '');
            molecules.set(id, molecule);
          }
        }
      }

      result.stats.moleculesChecked = molecules.size;
      logger.info(`Loaded ${molecules.size} molecules`);
    } catch (error) {
      result.addError('Failed to load molecules', { error: error.message });
    }

    return molecules;
  }
}

export default DataLoader;
