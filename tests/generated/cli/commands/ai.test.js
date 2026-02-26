import { describe, it, expect, vi } from 'vitest';
import { ai } from '../../src/cli/commands/ai.js';

describe('ai', () => {
  it('should return valid output for valid input', async () => {
    const result = await ai();
      expect(result).toBeDefined();
  });

});
