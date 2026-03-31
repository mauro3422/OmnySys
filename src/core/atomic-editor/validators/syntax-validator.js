/**
 * @fileoverview Syntax Validator
 * 
 * Validates JavaScript/TypeScript syntax before code execution.
 * Uses Node.js --check for validation.
 * 
 * @module atomic-editor/validators/syntax-validator
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Result of a syntax validation
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the syntax is valid
 * @property {string} [error] - Error message if invalid
 * @property {number} [line] - Line number of error
 * @property {number} [column] - Column number of error
 * @property {string} [details] - Detailed error information
 */

export class SyntaxValidator {
  /**
   * @param {string} projectPath - Base project path for temporary files
   */
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Validates JavaScript/TypeScript syntax
   * 
   * @param {string} filePath - Path to the file being validated
   * @param {string} content - Content to validate
   * @returns {Promise<ValidationResult>} - Validation result
   */
  async validate(filePath, content) {
    try {
      const { spawnSync } = await import('child_process');
      const tmpFile = path.join(this.projectPath, '.tmp-validation.js');
      const normalizedContent = this._prepareContent(content);

      await fs.writeFile(tmpFile, normalizedContent, { encoding: 'utf8' });

      try {
        const result = this._runNodeCheck(tmpFile);
        await fs.unlink(tmpFile).catch(() => { });
        return this._parseValidationResult(result);
      } catch (error) {
        await fs.unlink(tmpFile).catch(() => { });
        return { valid: false, error: `Validation error: ${error.message}` };
      }
    } catch (error) {
      return { valid: false, error: `Validation system error: ${error.message}` };
    }
  }

  /**
   * Prepares content with BOM and normalized Unicode
   */
  _prepareContent(content) {
    const BOM = '\uFEFF';
    const normalizedLineEndings = content.replace(/\r\n/g, '\n');
    return BOM + this._normalizeUnicode(normalizedLineEndings);
  }

  /**
   * Runs node --check via spawnSync
   */
  _runNodeCheck(tmpFile) {
    const { spawnSync } = require('child_process');
    return spawnSync(process.execPath, ['--check', tmpFile], {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
      env: { ...process.env, CHCP: '65001' }
    });
  }

  /**
   * Parses spawnSync result into ValidationResult
   */
  _parseValidationResult(result) {
    if (result.status !== 0) {
      const stderr = result.stderr || result.error?.message || '';
      const errorMatch = stderr.match(/(\d+):(\d+)\s*-\s*(.+)/);
      return {
        valid: false,
        error: stderr.split('\n')[0] || 'Syntax error',
        line: errorMatch ? parseInt(errorMatch[1]) : null,
        column: errorMatch ? parseInt(errorMatch[2]) : null,
        details: stderr
      };
    }
    return { valid: true };
  }

  /**
   * Normalizes Unicode for Windows compatibility
   */
  _normalizeUnicode(content) {
    if (process.platform !== 'win32') return content;
    try {
      return Buffer.from(content, 'utf8').toString('utf8');
    } catch (e) {
      return content;
    }
  }

  /**
   * Quick check if validation can be performed
   */
  isAvailable() {
    return true;
  }
}

/**
 * Factory function to create a syntax validator
 * @param {string} projectPath - Project path
 * @returns {SyntaxValidator}
 */
export function createSyntaxValidator(projectPath) {
  return new SyntaxValidator(projectPath);
}
