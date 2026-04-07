/**
 * @fileoverview Syntax Validator
 *
 * Validates JavaScript/TypeScript syntax before code execution.
 * Uses Node.js --check for validation.
 *
 * FRAGMENT-AWARE: When editing a fragment, validates the FULL file after
 * applying the change, not just the fragment itself.
 *
 * @module atomic-editor/validators/syntax-validator
 */

import fs from 'fs/promises';
import path from 'path';

export class SyntaxValidator {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Validates JavaScript/TypeScript syntax
   *
   * SMART MODE: If content looks like a fragment (not a full file),
   * reads the original file, applies the fragment, and validates the result.
   *
   * @param {string} filePath - Path to the file being validated
   * @param {string} content - Content to validate (can be fragment or full file)
   * @param {Object} options - Optional context
   * @param {string} options.originalFilePath - Original file path (for fragment validation)
   * @param {Object} options.atomMetadata - Atom metadata from DB (lineStart, lineEnd, signature, etc.)
   * @param {string} options.replacementStrategy - How to apply: 'replace-body', 'replace-full', 'insert-before', 'insert-after'
   * @returns {Promise<ValidationResult>}
   */
  async validate(filePath, content, options = {}) {
    try {
      const { spawnSync } = await import('child_process');
      const tmpFile = path.join(this.projectPath, '.tmp-validation.js');

      let contentToValidate;

      // Detect if this is a fragment edit
      const isFragment = options.originalFilePath ||
                         options.atomMetadata ||
                         options.replacementStrategy === 'replace-body';

      if (isFragment && options.atomMetadata) {
        // FRAGMENT MODE: Read original file, apply fragment, validate full file
        const absolutePath = path.isAbsolute(filePath)
          ? filePath
          : path.join(this.projectPath, filePath);

        const originalContent = await fs.readFile(absolutePath, 'utf-8');
        contentToValidate = this._applyFragmentToContent(
          originalContent,
          content,
          options.atomMetadata,
          options.replacementStrategy || 'replace-body'
        );

        // DEBUG: Log what we're validating
        console.log(`[SYNTAX-VALIDATOR] Fragment mode. Validating full file for ${filePath}`);
        console.log(`[SYNTAX-VALIDATOR] Atom: ${options.atomMetadata.name} lines ${options.atomMetadata.lineStart}-${options.atomMetadata.lineEnd}`);
        console.log(`[SYNTAX-VALIDATOR] Fragment content: "${content}"`);
        console.log(`[SYNTAX-VALIDATOR] First 200 chars of result: "${contentToValidate.substring(0, 200)}"`);
      } else {
        // FULL FILE MODE: Validate content as-is (for barrel files, new files, etc.)
        contentToValidate = this._prepareContent(content);
      }

      await fs.writeFile(tmpFile, contentToValidate, { encoding: 'utf8' });

      try {
        const result = this._runNodeCheck(tmpFile, spawnSync);

        // DON'T delete on error - keep for debugging
        if (result.status === 0) {
          await fs.unlink(tmpFile).catch(() => { });
        } else {
          // Keep file for debugging
          console.error(`[SYNTAX-VALIDATOR] Error in ${tmpFile}. File preserved for debug.`);
        }

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
   * Applies a fragment to the original file content
   *
   * Strategies:
   * - 'replace-body': Replace function body while preserving signature
   * - 'replace-full': Replace entire content (barrel files)
   * - 'insert-before': Insert before the atom
   * - 'insert-after': Insert after the atom
   */
  _applyFragmentToContent(originalContent, fragment, atomMetadata, strategy) {
    const { lineStart, lineEnd, name, signature } = atomMetadata;

    if (strategy === 'replace-full') {
      return this._prepareContent(fragment);
    }

    const lines = originalContent.split('\n');

    if (strategy === 'replace-body') {
      // FRAGMENT-AWARE: Replace ONLY the function body, preserving the signature
      const startIdx = lineStart - 1; // 0-based
      const endIdx = lineEnd - 1;     // 0-based

      // Extract the original function lines
      const functionLines = lines.slice(startIdx, endIdx + 1);
      const fullFunctionText = functionLines.join('\n');

      // Find the opening brace position (end of signature)
      const openBraceIdx = fullFunctionText.indexOf('{');
      const closeBraceIdx = fullFunctionText.lastIndexOf('}');

      if (openBraceIdx === -1 || closeBraceIdx === -1) {
        // Fallback: can't find braces, replace entire function
        const functionText = fullFunctionText.trim();
        // Build new function with signature + new body
        const newFunction = `${name}(...args) { ${fragment.trim()} }`;
        lines.splice(startIdx, endIdx - startIdx + 1, newFunction);
        return this._prepareContent(lines.join('\n'));
      }

      // Extract the signature part (everything up to and including opening brace)
      const signaturePart = fullFunctionText.substring(0, openBraceIdx + 1);

      // Build the new function: signature + new body + closing brace
      // The fragment is just the body (e.g., "return log(...args);")
      const newFunction = `${signaturePart}\n  ${fragment.trim()}\n}`;

      // Replace in the original content
      lines.splice(startIdx, endIdx - startIdx + 1, newFunction);
      return this._prepareContent(lines.join('\n'));
    }

    if (strategy === 'insert-before') {
      const startIdx = lineStart - 1;
      lines.splice(startIdx, 0, fragment.trim());
      return this._prepareContent(lines.join('\n'));
    }

    if (strategy === 'insert-after') {
      const endIdx = lineEnd;
      lines.splice(endIdx, 0, fragment.trim());
      return this._prepareContent(lines.join('\n'));
    }

    // Default: treat as full file
    return this._prepareContent(fragment);
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
  _runNodeCheck(tmpFile, spawnSync) {
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

  isAvailable() {
    return true;
  }
}

export function createSyntaxValidator(projectPath) {
  return new SyntaxValidator(projectPath);
}
