/**
 * @fileoverview Safety Validator
 * 
 * Validates safety constraints before executing edits.
 * Checks for potential dangerous operations, file permissions,
 * and ensures atomicity guarantees can be met.
 * 
 * @module atomic-editor/validators/safety-validator
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Safety check result
 * @typedef {Object} SafetyResult
 * @property {boolean} safe - Whether the operation is safe
 * @property {string} [error] - Error message if unsafe
 * @property {string} [warning] - Warning message
 * @property {string[]} [checks] - List of passed checks
 */

export class SafetyValidator {
  /**
   * @param {string} projectPath - Base project path
   * @param {Object} [options] - Safety options
   * @param {boolean} [options.allowOutsideProject=false] - Allow edits outside project
   * @param {string[]} [options.protectedPatterns=[]] - Glob patterns for protected files
   */
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.options = {
      allowOutsideProject: false,
      protectedPatterns: [],
      ...options
    };
  }

  /**
   * Validates if an edit operation is safe to perform
   * 
   * @param {string} filePath - Target file path
   * @param {Object} context - Operation context
   * @param {string} [context.oldString] - String being replaced
   * @param {string} [context.newString] - New string
   * @param {boolean} [context.isNewFile=false] - Whether creating new file
   * @returns {Promise<SafetyResult>} - Safety check result
   */
  async validateEdit(filePath, context = {}) {
    const checks = [];
    const absolutePath = path.join(this.projectPath, filePath);

    // Check 1: Path safety
    const pathCheck = await this._validatePath(absolutePath);
    if (!pathCheck.safe) return pathCheck;
    checks.push('path');

    // Check 2: File exists (for edits, not for creates)
    if (!context.isNewFile) {
      const existsCheck = await this._validateFileExists(absolutePath);
      if (!existsCheck.safe) return existsCheck;
      checks.push('file_exists');
    }

    // Check 3: Protected patterns
    const protectedCheck = this._validateProtectedPatterns(filePath);
    if (!protectedCheck.safe) return protectedCheck;
    checks.push('not_protected');

    // Check 4: Content safety
    const contentCheck = this._validateContent(context);
    if (!contentCheck.safe) return contentCheck;
    if (contentCheck.warning) {
      return {
        safe: true,
        warning: contentCheck.warning,
        checks
      };
    }
    checks.push('content');

    return {
      safe: true,
      checks
    };
  }

  /**
   * Validates if a write operation is safe
   * 
   * @param {string} filePath - Target file path
   * @param {string} content - Content to write
   * @returns {Promise<SafetyResult>} - Safety check result
   */
  async validateWrite(filePath, content) {
    return this.validateEdit(filePath, {
      newString: content,
      isNewFile: true
    });
  }

  /**
   * Validates path is within project boundaries
   * @private
   */
  async _validatePath(absolutePath) {
    const resolvedPath = path.resolve(absolutePath);
    const resolvedProject = path.resolve(this.projectPath);

    if (!this.options.allowOutsideProject) {
      const relative = path.relative(resolvedProject, resolvedPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return {
          safe: false,
          error: `Path outside project: ${absolutePath}`
        };
      }
    }

    return { safe: true };
  }

  /**
   * Validates file exists
   * @private
   */
  async _validateFileExists(absolutePath) {
    try {
      await fs.access(absolutePath);
      return { safe: true };
    } catch {
      return {
        safe: false,
        error: `File not found: ${absolutePath}`
      };
    }
  }

  /**
   * Validates against protected patterns
   * @private
   */
  _validateProtectedPatterns(filePath) {
    for (const pattern of this.options.protectedPatterns) {
      // Simple glob-like matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      if (regex.test(filePath)) {
        return {
          safe: false,
          error: `File matches protected pattern: ${pattern}`
        };
      }
    }
    return { safe: true };
  }

  /**
   * Validates content safety
   * @private
   */
  _validateContent(context) {
    const { oldString, newString } = context;

    // Check for potentially dangerous operations
    if (newString) {
      // Check for eval usage
      if (/eval\s*\(/.test(newString)) {
        return {
          safe: true,
          warning: 'Content contains eval() - use with caution'
        };
      }

      // Check for very large additions
      if (newString.length > 100000) {
        return {
          safe: true,
          warning: 'Large content addition (>100KB)'
        };
      }
    }

    // Check for empty replacement
    if (oldString && oldString.trim() && (!newString || !newString.trim())) {
      return {
        safe: true,
        warning: 'Replacing non-empty content with empty'
      };
    }

    return { safe: true };
  }
}

/**
 * Factory function to create a safety validator
 * @param {string} projectPath - Project path
 * @param {Object} [options] - Safety options
 * @returns {SafetyValidator}
 */
export function createSafetyValidator(projectPath, options) {
  return new SafetyValidator(projectPath, options);
}
