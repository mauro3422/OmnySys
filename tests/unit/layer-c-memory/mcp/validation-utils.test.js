/**
 * Test simple de validation-utils.js
 * Verifica que use el storage correctamente sin imports dinámicos
 */

import { describe, it, expect } from 'vitest';
import {
  validateFileExists,
  validatePath,
  validateBeforeWrite
} from '../../../../src/layer-c-memory/mcp/core/validation-utils.js';

describe('validation-utils - arquitectura correcta', () => {
  describe('validatePath', () => {
    it('detecta paths absolutas como warning', () => {
      const result = validatePath('C:\\project\\file.js');
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('absolute'))).toBe(true);
    });

    it('detecta caracteres inválidos como error', () => {
      const result = validatePath('src/file<>.js');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid'))).toBe(true);
    });

    it('acepta paths relativas válidas', () => {
      const result = validatePath('src/utils/helper.js');
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateBeforeWrite', () => {
    it('valida que el directorio padre no exista', async () => {
      const result = await validateBeforeWrite({ 
        filePath: 'nonexistent/path/file.js' 
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Parent directory'))).toBe(true);
    });
  });
});
