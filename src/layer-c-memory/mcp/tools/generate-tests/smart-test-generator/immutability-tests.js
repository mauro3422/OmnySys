/**
 * Immutability test generator
 * @module mcp/tools/generate-tests/smart-test-generator/immutability-tests
 */

/**
 * Genera tests de inmutabilidad
 * @param {string} className - Class name
 * @returns {string} - Generated test code
 */
export function generateImmutabilityTests(className) {
  return `  describe('immutability', () => {
    it('should not mutate builder on build', () => {
      const builder = new ${className}();
      const before = { ...builder };
      builder.build();
      expect(builder).toEqual(before);
    });

    it('should return new object on each build', () => {
      const builder = new ${className}();
      const result1 = builder.build();
      const result2 = builder.build();
      expect(result1).not.toBe(result2);
    });
  });

`;
}
