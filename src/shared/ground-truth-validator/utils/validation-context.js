/**
 * @fileoverview Validation Context
 * 
 * Contexto compartido para validaciones.
 * 
 * @module ground-truth-validator/utils/validation-context
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { safeReadJson } from '../../../utils/json-safe.js';

export class ValidationContext {
  constructor(projectPath, omnysysPath) {
    this.projectPath = projectPath;
    this.omnysysPath = omnysysPath;
    this._cache = new Map();
  }

  async getAllAtoms() {
    if (this._cache.has('atoms')) {
      return this._cache.get('atoms');
    }

    const atoms = new Map();
    const atomsPath = path.join(this.omnysysPath, 'atoms');
    
    try {
      const files = await fs.readdir(atomsPath);
      
      for (const fileDir of files) {
        const fileAtomsPath = path.join(atomsPath, fileDir);
        
        try {
          const stat = await fs.stat(fileAtomsPath);
          if (!stat.isDirectory()) continue;
        } catch { continue; }
        
        const atomFiles = await fs.readdir(fileAtomsPath);
        
        for (const atomFile of atomFiles) {
          if (!atomFile.endsWith('.json')) continue;
          
          const atom = await safeReadJson(path.join(fileAtomsPath, atomFile));
          if (atom?.id) atoms.set(atom.id, atom);
        }
      }
    } catch (error) {
      console.error('Error loading atoms:', error);
    }

    this._cache.set('atoms', atoms);
    return atoms;
  }

  getCached(key) {
    return this._cache.get(key);
  }

  setCached(key, value) {
    this._cache.set(key, value);
    return value;
  }
}

export default ValidationContext;
