/**
 * @fileoverview Atom Validator
 * 
 * Valida que los átomos coincidan con el código fuente.
 * 
 * @module ground-truth-validator/validators/atom-validator
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseValidator } from './base-validator.js';
import { safeReadJson } from '../../../utils/json-safe.js';
import { createLogger } from '../../logger-system.js';

const logger = createLogger('OmnySys:validator:atoms');

export class AtomValidator extends BaseValidator {
  constructor() {
    super('atom-validator');
  }

  async validate(context) {
    const result = {
      phase: 'atoms',
      valid: true,
      stats: { filesChecked: 0, atomsVerified: 0, errors: 0 },
      mismatches: []
    };

    const atomsPath = path.join(context.omnysysPath, 'atoms');

    try {
      const files = await fs.readdir(atomsPath);
      
      for (const fileDir of files) {
        const validation = await this.validateFileDir(fileDir, context);
        result.stats.filesChecked++;
        result.stats.atomsVerified += validation.atomsChecked;
        result.stats.errors += validation.errors.length;
        result.mismatches.push(...validation.errors);
        
        if (validation.errors.length > 0) result.valid = false;
      }
    } catch (error) {
      logger.error('Error validating atoms:', error);
      result.mismatches.push({ type: 'VALIDATION_ERROR', message: error.message });
      result.valid = false;
    }

    return result;
  }

  async validateFileDir(fileDir, context) {
    const fileAtomsPath = path.join(context.omnysysPath, 'atoms', fileDir);
    const sourcePath = path.join(context.projectPath, fileDir.replace(/_/g, '/'));
    
    const result = { atomsChecked: 0, errors: [] };

    try {
      const stat = await fs.stat(fileAtomsPath);
      if (!stat.isDirectory()) return result;
    } catch { return result; }

    let sourceCode;
    try {
      sourceCode = await fs.readFile(sourcePath, 'utf-8');
    } catch {
      result.errors.push({ type: 'SOURCE_FILE_MISSING', file: fileDir, expectedPath: sourcePath });
      return result;
    }

    const atomFiles = await fs.readdir(fileAtomsPath);
    
    for (const atomFile of atomFiles) {
      if (!atomFile.endsWith('.json')) continue;
      
      const atom = await safeReadJson(path.join(fileAtomsPath, atomFile));
      if (!atom) continue;
      
      result.atomsChecked++;
      
      const exists = this.verifyFunctionExists(atom, sourceCode);
      if (!exists.found) {
        result.errors.push({
          type: 'FUNCTION_NOT_FOUND',
          file: fileDir,
          function: atom.name,
          line: atom.line
        });
      }
    }

    return result;
  }

  verifyFunctionExists(atom, sourceCode) {
    const lines = sourceCode.split('\n');
    
    if (atom.line && atom.line <= lines.length) {
      if (lines[atom.line - 1]?.includes(atom.name)) {
        return { found: true, atLine: atom.line };
      }
    }

    const patterns = [
      new RegExp(`\\bfunction\\s+${this.escapeRegex(atom.name)}\\s*\\(`),
      new RegExp(`\\b(?:const|let|var)\\s+${this.escapeRegex(atom.name)}\\s*[=:]`)
    ];

    for (let i = 0; i < lines.length; i++) {
      if (patterns.some(p => p.test(lines[i]))) {
        return { found: true, atLine: i + 1 };
      }
    }

    return { found: false };
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default AtomValidator;
