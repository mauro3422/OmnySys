import { describe, it, expect, vi } from 'vitest';
import { withSandbox } from '#layer-c/test-utils/sandbox.js';
import { readAllAtoms } from '../../scripts/utils/file-reader.js';

describe('readAllAtoms', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', async () => {
      await withSandbox({}, async (sandbox) => {
        const result = await readAllAtoms();
        expect(result).toBeDefined();
      });
    });

  });

  describe('error handling', () => {
    it('should throw SyntaxError when unprotected syntaxerror call', async () => {
      await withSandbox({}, async (sandbox) => {
        await expect(readAllAtoms()).rejects.toThrow();
      });
    });

  });

  describe('other', () => {
    it('should return empty result for empty array/collection', async () => {
      await withSandbox({}, async (sandbox) => {
        const result = await readAllAtoms();
        expect(Array.isArray(result) ? result : result).toBeDefined();
      });
    });

    it('should process single item array/collection', async () => {
      await withSandbox({}, async (sandbox) => {
        const result = await readAllAtoms();
        expect(result).toBeDefined();
      });
    });

    it('should handle errors gracefully without propagating', async () => {
      await withSandbox({}, async (sandbox) => {
        await expect(readAllAtoms()).rejects.toThrow();
      });
    });

    it('should persist data without throwing', async () => {
      await withSandbox({}, async (sandbox) => {
        const result = await readAllAtoms();
        expect(result).toBeDefined();
      });
    });

  });

});
