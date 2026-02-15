/**
 * @fileoverview Tests for error-handling.js extractor
 * 
 * @module tests/error-handling
 */

import { describe, it, expect } from 'vitest';
import { extractErrorHandling } from '#layer-a/extractors/metadata/error-handling.js';

describe('error-handling', () => {
  describe('basic structure', () => {
    it('should export extractErrorHandling function', () => {
      expect(typeof extractErrorHandling).toBe('function');
    });

    it('should return object with all expected properties', () => {
      const result = extractErrorHandling('');
      expect(result).toHaveProperty('tryBlocks');
      expect(result).toHaveProperty('throwStatements');
      expect(result).toHaveProperty('errorCodes');
      expect(result).toHaveProperty('customErrors');
      expect(result).toHaveProperty('errorMessages');
      expect(result).toHaveProperty('catchBlocks');
      expect(result).toHaveProperty('all');
    });
  });

  describe('try block detection', () => {
    it('should detect try/catch blocks', () => {
      const code = 'try { risky(); } catch (e) { handle(e); }';
      const result = extractErrorHandling(code);
      expect(result.tryBlocks).toHaveLength(1);
      expect(result.tryBlocks[0]).toMatchObject({
        type: 'try_catch',
        errorVar: 'e'
      });
    });

    it('should detect try/catch/finally blocks', () => {
      const code = 'try { } catch (e) { } finally { cleanup(); }';
      const result = extractErrorHandling(code);
      expect(result.tryBlocks).toHaveLength(1);
    });

    it('should include line numbers', () => {
      const code = 'try { } catch (e) { }';
      const result = extractErrorHandling(code);
      expect(result.tryBlocks[0].line).toBeDefined();
      expect(typeof result.tryBlocks[0].line).toBe('number');
    });
  });

  describe('throw statement detection', () => {
    it('should detect throw with new Error', () => {
      const code = 'throw new Error("Something went wrong");';
      const result = extractErrorHandling(code);
      expect(result.throwStatements).toHaveLength(1);
      expect(result.throwStatements[0]).toMatchObject({
        type: 'throw',
        errorType: 'Error',
        message: 'Something went wrong'
      });
    });

    it('should detect throw without new', () => {
      const code = 'throw CustomError("message");';
      const result = extractErrorHandling(code);
      expect(result.throwStatements[0].errorType).toBe('CustomError');
    });

    it('should detect throw with variable', () => {
      const code = 'throw err;';
      const result = extractErrorHandling(code);
      expect(result.throwStatements[0].errorType).toBe('');
    });

    it('should include line numbers', () => {
      const code = 'throw new Error("test");';
      const result = extractErrorHandling(code);
      expect(result.throwStatements[0].line).toBeDefined();
    });
  });

  describe('error code detection', () => {
    it('should detect ERR_ prefixed codes', () => {
      const code = "const code = 'ERR_INVALID_ARG_TYPE';";
      const result = extractErrorHandling(code);
      expect(result.errorCodes).toHaveLength(1);
      expect(result.errorCodes[0]).toMatchObject({
        type: 'error_code',
        code: 'ERR_INVALID_ARG_TYPE'
      });
    });

    it('should detect E_ prefixed codes', () => {
      const code = "if (err.code === 'EACCES') { }";
      const result = extractErrorHandling(code);
      expect(result.errorCodes.some(c => c.code === 'EACCES')).toBe(true);
    });

    it('should detect CODE_ prefixed codes', () => {
      const code = "const c = 'CODE_NOT_FOUND';";
      const result = extractErrorHandling(code);
      expect(result.errorCodes.some(c => c.code === 'CODE_NOT_FOUND')).toBe(true);
    });

    it('should detect error code checks', () => {
      const code = "if (err.code === 'ENOENT') { }";
      const result = extractErrorHandling(code);
      expect(result.errorCodes.some(c => c.type === 'error_code_check')).toBe(true);
    });

    it('should capture variable in code check', () => {
      const code = "if (error.code === 'ENOENT') { }";
      const result = extractErrorHandling(code);
      const check = result.errorCodes.find(c => c.type === 'error_code_check');
      expect(check.variable).toBe('error');
      expect(check.code).toBe('ENOENT');
    });
  });

  describe('custom error detection', () => {
    it('should detect custom error classes extending Error', () => {
      const code = 'class ValidationError extends Error {}';
      const result = extractErrorHandling(code);
      expect(result.customErrors).toHaveLength(1);
      expect(result.customErrors[0]).toMatchObject({
        type: 'custom_error_class',
        name: 'ValidationError'
      });
    });

    it('should detect custom errors extending other errors', () => {
      const code = 'class NetworkError extends HttpError {}';
      const result = extractErrorHandling(code);
      expect(result.customErrors[0].name).toBe('NetworkError');
    });

    it('should detect multiple custom errors', () => {
      const code = `
        class ErrorA extends Error {}
        class ErrorB extends Error {}
      `;
      const result = extractErrorHandling(code);
      expect(result.customErrors).toHaveLength(2);
    });
  });

  describe('error message detection', () => {
    it('should detect long error messages', () => {
      const code = 'throw new Error("This is a very long error message that exceeds ten characters");';
      const result = extractErrorHandling(code);
      expect(result.errorMessages).toHaveLength(1);
    });

    it('should not detect short messages', () => {
      const code = 'throw new Error("short");';
      const result = extractErrorHandling(code);
      expect(result.errorMessages).toHaveLength(0);
    });

    it('should detect error in Error constructor', () => {
      const code = 'new Error("This is a detailed error message explaining what went wrong")';
      const result = extractErrorHandling(code);
      expect(result.errorMessages).toHaveLength(1);
    });
  });

  describe('all array', () => {
    it('should combine all error items', () => {
      const code = `
        try { } catch (e) { }
        throw new Error("test");
        class CustomError extends Error {}
      `;
      const result = extractErrorHandling(code);
      expect(result.all.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = extractErrorHandling('');
      expect(result.tryBlocks).toHaveLength(0);
      expect(result.throwStatements).toHaveLength(0);
      expect(result.errorCodes).toHaveLength(0);
      expect(result.customErrors).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should handle code without error handling', () => {
      const code = 'function simple() { return 42; }';
      const result = extractErrorHandling(code);
      expect(result.all).toHaveLength(0);
    });

    it('should handle nested try blocks', () => {
      const code = `
        try {
          try {
            risky();
          } catch (e) { }
        } catch (e) { }
      `;
      const result = extractErrorHandling(code);
      expect(result.tryBlocks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
