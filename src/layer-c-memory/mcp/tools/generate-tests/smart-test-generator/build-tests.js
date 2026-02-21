/**
 * Build method test generator
 * @module mcp/tools/generate-tests/smart-test-generator/build-tests
 */

/**
 * Genera tests del método build
 * @param {string} className - Class name
 * @returns {string} - Generated test code
 */
export function generateBuildMethodTests(className) {
  return `  describe('build', () => {
    it('should build with default configuration', () => {
      const builder = new ${className}();
      const result = builder.build();
      expect(result).toBeDefined();
    });

    it('should build with custom configuration', () => {
      const builder = new ${className}();
      // Configure builder...
      const result = builder.build();
      expect(result).toBeDefined();
    });
  });

`;
}
