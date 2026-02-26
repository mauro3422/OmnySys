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

      // PASO 1: Normalizar contenido para soporte Unicode completo
      // Agregar BOM UTF-8 para forzar codificación correcta en Windows
      const BOM = '\uFEFF';
      const normalizedContent = BOM + this._normalizeUnicode(content);

      // PASO 2: Write to temporary file with explicit UTF-8 encoding
      await fs.writeFile(tmpFile, normalizedContent, { encoding: 'utf8' });

      try {
        // PASO 3: Validate with node --check
        // Use spawnSync with direct node path (NO shell string) so Windows
        // does NOT open a cmd.exe intermediary window in VSCode terminal.
        const result = spawnSync(process.execPath, ['--check', tmpFile], {
          encoding: 'utf-8',
          timeout: 5000,
          windowsHide: true,   // hide the Node.js console window
          env: { ...process.env, CHCP: '65001' }  // UTF-8 without chcp cmd
        });

        // Clean up temp file
        await fs.unlink(tmpFile).catch(() => { });

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

      } catch (error) {
        // Clean up temp file
        await fs.unlink(tmpFile).catch(() => { });

        return {
          valid: false,
          error: `Validation error: ${error.message}`
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
   * Normaliza caracteres Unicode problemáticos
   * Reemplaza emojis y caracteres especiales que pueden causar problemas en Windows
   */
  _normalizeUnicode(content) {
    // En Windows, algunos emojis pueden causar problemas con node --check
    // Esta función preserva el contenido pero asegura codificación correcta
    if (process.platform !== 'win32') {
      return content; // En Unix/Mac no hay problema
    }

    // Para Windows, aseguramos que el contenido sea string válido UTF-16
    // que se convertirá correctamente a UTF-8
    try {
      // Verificar que podemos codificar/decodificar sin pérdida
      const buffer = Buffer.from(content, 'utf8');
      const decoded = buffer.toString('utf8');
      return decoded;
    } catch (e) {
      // Si hay error, retornar contenido original (el BOM ayudará)
      return content;
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
