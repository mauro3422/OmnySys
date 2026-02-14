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
      const { execSync } = await import('child_process');
      const tmpFile = path.join(this.projectPath, '.tmp-validation.js');
      
      // Write to temporary file
      await fs.writeFile(tmpFile, content, 'utf-8');
      
      try {
        // Validate with node --check
        execSync(`node --check "${tmpFile}"`, { 
          encoding: 'utf-8',
          timeout: 5000
        });
        
        // Clean up temp file
        await fs.unlink(tmpFile).catch(() => {});
        
        return { valid: true };
        
      } catch (error) {
        // Clean up temp file
        await fs.unlink(tmpFile).catch(() => {});
        
        // Parse syntax error
        const errorMatch = error.stderr?.match(/(\d+):(\d+)\s*-\s*(.+)/);
        
        return {
          valid: false,
          error: error.stderr?.split('\n')[0] || error.message,
          line: errorMatch ? parseInt(errorMatch[1]) : null,
          column: errorMatch ? parseInt(errorMatch[2]) : null,
          details: error.stderr
        };
      }
      
    } catch (error) {
      return {
        valid: false,
        error: `Validation system error: ${error.message}`
      };
    }
  }

  /**
   * Quick check if validation can be performed
   * @returns {boolean}
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
