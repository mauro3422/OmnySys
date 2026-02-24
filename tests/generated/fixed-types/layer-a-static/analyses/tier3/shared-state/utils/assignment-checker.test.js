import { describe, it, expect, vi } from 'vitest';
import { isPartOfAssignmentLeft } from '#layer-a/analyses/tier3/shared-state/utils/assignment-checker.js';

describe('isPartOfAssignmentLeft', () => {
  describe('happy path', () => {
    it('should return valid output for valid input', () => {
      const result = isPartOfAssignmentLeftSync("/test/file.js");
        expect(typeof result).toBe("boolean");
    });

  });

  describe('branches', () => {
    it('should return true when parentNode?.type === AssignmentExpression', () => {
      const result = isPartOfAssignmentLeftSync(new AtomBuilder().build());
        expect(result).toBe(true);
    });

    it('should return false as default', () => {
      const result = isPartOfAssignmentLeftSync(new AtomBuilder().build());
        expect(result).toBe(false);
    });

  });

  describe('edge cases', () => {
    it('should handle nodePath = null/undefined', () => {
      const result = isPartOfAssignmentLeftSync(null);
        expect(result).toBe(false);
    });

    it('should handle nodePath = empty string', () => {
      const result = isPartOfAssignmentLeftSync("");
        expect(typeof result).toBe("boolean");
    });

  });

});
